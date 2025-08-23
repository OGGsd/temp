import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import useAlertStore from "@/stores/alertStore";
import { SAVE_SUCCESS_ALERT, SAVE_ERROR_ALERT } from "@/constants/alerts_constants";
import LocalLLMsPageHeader from "./components/LocalLLMsPageHeader";
import ModelCard from "./components/ModelCard";
import OllamaStatus from "./components/OllamaStatus";
import RecommendedModels from "./components/RecommendedModels";

interface ModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
  digest?: string;
  details?: any;
}

interface OllamaStatusInfo {
  status: string;
  is_running: boolean;
  is_embedded: boolean;
  base_url: string;
  models_count: number;
  models: string[];
  process_id?: number;
}

interface RecommendedModel {
  name: string;
  size: string;
  description: string;
  use_case: string;
  recommended: boolean;
}

export const LocalLLMsPage = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [status, setStatus] = useState<OllamaStatusInfo | null>(null);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/v1/local-llms/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Ollama status:", error);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/v1/local-llms/models");
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  };

  const fetchRecommendedModels = async () => {
    try {
      const response = await fetch("/api/v1/local-llms/recommended-models");
      if (response.ok) {
        const data = await response.json();
        setRecommendedModels(data);
      }
    } catch (error) {
      console.error("Failed to fetch recommended models:", error);
    }
  };

  const pullModel = async (modelName: string) => {
    setPullingModel(modelName);
    try {
      const response = await fetch("/api/v1/local-llms/models/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model_name: modelName }),
      });

      if (response.ok) {
        setSuccessData({
          title: "Model Downloaded",
          list: [`Successfully downloaded ${modelName}`],
        });
        await fetchModels();
        await fetchStatus();
      } else {
        const error = await response.json();
        setErrorData({
          title: "Download Failed",
          list: [error.detail || `Failed to download ${modelName}`],
        });
      }
    } catch (error) {
      setErrorData({
        title: "Download Error",
        list: [`Error downloading ${modelName}: ${error}`],
      });
    } finally {
      setPullingModel(null);
    }
  };

  const deleteModel = async (modelName: string) => {
    setDeletingModel(modelName);
    try {
      const response = await fetch(`/api/v1/local-llms/models/${encodeURIComponent(modelName)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessData({
          title: "Model Deleted",
          list: [`Successfully deleted ${modelName}`],
        });
        await fetchModels();
        await fetchStatus();
      } else {
        const error = await response.json();
        setErrorData({
          title: "Delete Failed",
          list: [error.detail || `Failed to delete ${modelName}`],
        });
      }
    } catch (error) {
      setErrorData({
        title: "Delete Error",
        list: [`Error deleting ${modelName}: ${error}`],
      });
    } finally {
      setDeletingModel(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStatus(),
        fetchModels(),
        fetchRecommendedModels(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const refreshData = async () => {
    await Promise.all([
      fetchStatus(),
      fetchModels(),
    ]);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col gap-6">
        <LocalLLMsPageHeader />
        <div className="flex items-center justify-center h-64">
          <ForwardedIconComponent name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-x-hidden">
      <LocalLLMsPageHeader />

      <div className="flex w-full flex-col gap-6">
        <OllamaStatus status={status} onRefresh={refreshData} />

        <Tabs defaultValue="installed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installed">
              Installed Models ({models.length})
            </TabsTrigger>
            <TabsTrigger value="recommended">
              Recommended Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="space-y-4">
            {models.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <ForwardedIconComponent name="Package" className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Models Installed</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Get started by downloading a recommended model from the "Recommended Models" tab.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {models.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    onDelete={() => deleteModel(model.name)}
                    isDeleting={deletingModel === model.name}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommended" className="space-y-4">
            <RecommendedModels
              models={recommendedModels}
              installedModels={models.map(m => m.name)}
              onPull={pullModel}
              pullingModel={pullingModel}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LocalLLMsPage;
