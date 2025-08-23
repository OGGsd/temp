import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ForwardedIconComponent from "@/components/common/genericIconComponent";

interface ModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
  digest?: string;
  details?: any;
}

interface ModelCardProps {
  model: ModelInfo;
  onDelete: () => void;
  isDeleting: boolean;
}

const ModelCard = ({ model, onDelete, isDeleting }: ModelCardProps) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getModelIcon = (modelName: string) => {
    if (modelName.includes("gemma")) return "Gem";
    if (modelName.includes("llama")) return "Zap";
    if (modelName.includes("phi")) return "Brain";
    if (modelName.includes("qwen")) return "Globe";
    return "Bot";
  };

  const isRecommended = (modelName: string) => {
    const recommendedModels = ["gemma2:2b", "llama3.2:3b"];
    return recommendedModels.some(rec => modelName.includes(rec));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ForwardedIconComponent 
              name={getModelIcon(model.name)} 
              className="h-6 w-6 text-primary" 
            />
            <div>
              <CardTitle className="text-base">{model.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {formatSize(model.size)}
                {isRecommended(model.name) && (
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeleting ? (
              <ForwardedIconComponent name="Loader2" className="h-4 w-4 animate-spin" />
            ) : (
              <ForwardedIconComponent name="Trash2" className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Modified</p>
            <p>{formatDate(model.modified_at)}</p>
          </div>
          {model.digest && (
            <div>
              <p className="font-medium text-muted-foreground">Digest</p>
              <p className="font-mono text-xs truncate">{model.digest.slice(0, 16)}...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelCard;
