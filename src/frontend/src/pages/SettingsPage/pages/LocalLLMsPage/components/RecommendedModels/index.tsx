import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ForwardedIconComponent from "@/components/common/genericIconComponent";

interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  use_case: string;
  recommended: boolean;
}

interface RecommendedModelsProps {
  models: RecommendedModel[];
  installedModels: string[];
  onPull: (modelName: string) => void;
  pullingModel: string | null;
}

const RecommendedModels = ({ models, installedModels, onPull, pullingModel }: RecommendedModelsProps) => {
  const getModelIcon = (modelName: string) => {
    if (modelName.includes("gemma")) return "Gem";
    if (modelName.includes("llama")) return "Zap";
    if (modelName.includes("phi")) return "Brain";
    if (modelName.includes("qwen")) return "Globe";
    if (modelName.includes("tiny")) return "Minimize";
    return "Bot";
  };

  const isInstalled = (modelName: string) => {
    return installedModels.some(installed => installed.includes(modelName.split(':')[0]));
  };

  const isPulling = (modelName: string) => {
    return pullingModel === modelName;
  };

  // Sort models to show recommended ones first
  const sortedModels = [...models].sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ForwardedIconComponent name="Star" className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Recommended Models</h3>
      </div>
      
      <div className="grid gap-4">
        {sortedModels.map((model) => {
          const installed = isInstalled(model.name);
          const pulling = isPulling(model.name);
          
          return (
            <Card key={model.name} className={model.recommended ? "border-primary/20" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ForwardedIconComponent 
                      name={getModelIcon(model.name)} 
                      className="h-6 w-6 text-primary" 
                    />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {model.name}
                        {model.recommended && (
                          <Badge variant="default" className="text-xs">
                            <ForwardedIconComponent name="Star" className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                        {installed && (
                          <Badge variant="secondary" className="text-xs">
                            <ForwardedIconComponent name="Check" className="h-3 w-3 mr-1" />
                            Installed
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{model.size}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={installed ? "outline" : "default"}
                    size="sm"
                    onClick={() => onPull(model.name)}
                    disabled={installed || pulling}
                  >
                    {pulling ? (
                      <>
                        <ForwardedIconComponent name="Loader2" className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : installed ? (
                      <>
                        <ForwardedIconComponent name="Check" className="h-4 w-4 mr-2" />
                        Installed
                      </>
                    ) : (
                      <>
                        <ForwardedIconComponent name="Download" className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{model.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {model.use_case}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ForwardedIconComponent name="Info" className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                About Model Sizes
              </p>
              <p className="text-sm text-blue-800">
                Smaller models (1-3B parameters) are faster and use less memory, while larger models 
                provide better quality responses. For most use cases, Gemma2 2B offers the best 
                balance of speed and performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecommendedModels;
