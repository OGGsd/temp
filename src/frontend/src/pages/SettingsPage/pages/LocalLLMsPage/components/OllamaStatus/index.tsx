import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ForwardedIconComponent from "@/components/common/genericIconComponent";

interface OllamaStatusInfo {
  status: string;
  is_running: boolean;
  is_embedded: boolean;
  base_url: string;
  models_count: number;
  models: string[];
  process_id?: number;
}

interface OllamaStatusProps {
  status: OllamaStatusInfo | null;
  onRefresh: () => void;
}

const OllamaStatus = ({ status, onRefresh }: OllamaStatusProps) => {
  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ForwardedIconComponent name="AlertCircle" className="h-5 w-5 text-yellow-500" />
            Ollama Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading status...</p>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = status.is_running && status.status === "healthy";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ForwardedIconComponent 
              name={isHealthy ? "CheckCircle" : "XCircle"} 
              className={`h-5 w-5 ${isHealthy ? "text-green-500" : "text-red-500"}`} 
            />
            Ollama Service
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {isHealthy ? "Running" : "Offline"}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <ForwardedIconComponent name="RefreshCw" className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          {status.is_embedded 
            ? "Using embedded Ollama instance" 
            : "Using external Ollama instance"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Status</p>
            <p className="text-sm text-muted-foreground capitalize">{status.status}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Base URL</p>
            <p className="text-sm text-muted-foreground font-mono">{status.base_url}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Models</p>
            <p className="text-sm text-muted-foreground">{status.models_count} installed</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Type</p>
            <p className="text-sm text-muted-foreground">
              {status.is_embedded ? "Embedded" : "External"}
            </p>
          </div>
        </div>

        {status.process_id && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Process ID: {status.process_id}
            </p>
          </div>
        )}

        {!isHealthy && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <ForwardedIconComponent name="AlertTriangle" className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                Ollama service is not running. Please check your configuration.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OllamaStatus;
