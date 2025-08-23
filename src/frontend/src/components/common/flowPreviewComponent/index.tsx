import { useEffect, useState } from "react";
import { ReactFlow, Node, Edge, Background, Controls, MiniMap } from "@xyflow/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, ExternalLink, User, Calendar, Heart, Eye } from "lucide-react";
import { cn } from "@/utils/utils";

interface FlowPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    description: string;
    type: "FLOW" | "COMPONENT";
    author: {
      username: string;
      full_name: string;
    };
    store_url: string;
    stats: {
      downloads: number;
      likes: number;
    };
    dates: {
      created: string;
      updated: string;
    };
    tags: Array<{
      tags_id: {
        name: string;
        id: string;
      };
    }>;
  };
  onImport: (item: any) => void;
}

interface FlowData {
  nodes: Node[];
  edges: Edge[];
  data?: any;
}

export default function FlowPreviewComponent({
  isOpen,
  onClose,
  item,
  onImport,
}: FlowPreviewProps) {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      loadFlowData();
    }
  }, [isOpen, item]);

  const loadFlowData = async () => {
    if (!item) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = item.type === "FLOW" ? "flow" : "component";
      const response = await fetch(`/api/v1/store/${endpoint}/${item.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${item.type.toLowerCase()} data`);
      }

      const data = await response.json();
      
      // Extract nodes and edges from the data
      if (data.data && data.data.nodes && data.data.edges) {
        const nodes: Node[] = data.data.nodes.map((node: any) => ({
          id: node.id,
          type: node.type || 'default',
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.data?.node?.display_name || node.data?.type || 'Node',
            type: node.data?.type,
            ...node.data,
          },
          style: {
            background: getNodeColor(node.data?.type),
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '150px',
          },
        }));

        const edges: Edge[] = data.data.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }));

        setFlowData({ nodes, edges, data });
      } else {
        // For components, create a single node representation
        const singleNode: Node = {
          id: item.id,
          type: 'default',
          position: { x: 250, y: 100 },
          data: {
            label: item.name,
            type: 'component',
          },
          style: {
            background: '#f3f4f6',
            border: '2px solid #6366f1',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '200px',
            textAlign: 'center',
          },
        };

        setFlowData({ nodes: [singleNode], edges: [], data });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flow data');
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (nodeType: string): string => {
    const colors: Record<string, string> = {
      'ChatInput': '#10b981',
      'ChatOutput': '#f59e0b',
      'Prompt': '#8b5cf6',
      'LLM': '#3b82f6',
      'OpenAI': '#3b82f6',
      'Anthropic': '#6366f1',
      'Memory': '#ec4899',
      'VectorStore': '#06b6d4',
      'Retriever': '#06b6d4',
      'TextSplitter': '#84cc16',
      'Embeddings': '#f97316',
      'Agent': '#ef4444',
      'Tool': '#64748b',
      'CustomComponent': '#8b5cf6',
      default: '#f3f4f6',
    };

    return colors[nodeType] || colors.default;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleOpenInStore = () => {
    window.open(item.store_url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{item.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>
            </div>
            <Badge variant={item.type === "FLOW" ? "default" : "secondary"}>
              {item.type}
            </Badge>
          </div>
        </DialogHeader>

        {/* Metadata */}
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{item.author.full_name || item.author.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>{item.stats.downloads} downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>{item.stats.likes} likes</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDate(item.dates.updated)}</span>
            </div>
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag.tags_id.id} variant="outline" className="text-xs">
                  {tag.tags_id.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Flow Visualization */}
        <div className="flex-1 relative bg-gray-50 rounded-lg overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="text-center">
                <p className="text-red-600 mb-2">Failed to load preview</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {flowData && !loading && !error && (
            <ReactFlow
              nodes={flowData.nodes}
              edges={flowData.edges}
              fitView
              attributionPosition="bottom-left"
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              className="bg-gray-50"
            >
              <Background color="#e5e7eb" gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor="#f3f4f6"
                className="bg-white border border-gray-200"
              />
            </ReactFlow>
          )}

          {!flowData && !loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No preview available</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleOpenInStore}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View in Original Store
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onImport(item)} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import to AxieStudio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
