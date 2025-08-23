import React, { useState, useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap, Node, Edge } from "@xyflow/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import IconComponent from "../common/genericIconComponent";
import { cn } from "../../utils/utils";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  type: "FLOW" | "COMPONENT";
  author: {
    username: string;
    full_name?: string;
  };
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
  technical?: {
    last_tested_version?: string;
    private?: boolean;
  };
}

interface FlowPreviewDialogProps {
  item: StoreItem | null;
  isOpen: boolean;
  onClose: () => void;
  onGrab: (item: StoreItem) => void;
  onToggleFavorite: (itemId: string) => void;
  isFavorite: boolean;
  isGrabbing: boolean;
}

interface FlowData {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export default function FlowPreviewDialog({
  item,
  isOpen,
  onClose,
  onGrab,
  onToggleFavorite,
  isFavorite,
  isGrabbing,
}: FlowPreviewDialogProps) {
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load flow data when item changes
  useEffect(() => {
    if (!item || !isOpen) {
      setFlowData(null);
      return;
    }

    const loadFlowData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load the actual flow data from the store
        const response = await fetch(`/api/v1/axiestudio-store/download/${item.id}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract flow data from the downloaded JSON
          if (data.data && data.data.nodes && data.data.edges) {
            setFlowData({
              nodes: data.data.nodes || [],
              edges: data.data.edges || [],
              viewport: data.data.viewport || { x: 0, y: 0, zoom: 1 }
            });
          } else {
            // Create a placeholder visualization for components or invalid flows
            setFlowData(createPlaceholderFlow(item));
          }
        } else {
          // Create placeholder if download fails
          setFlowData(createPlaceholderFlow(item));
        }
      } catch (err) {
        console.error("Failed to load flow data:", err);
        setFlowData(createPlaceholderFlow(item));
        setError("Failed to load flow preview");
      } finally {
        setLoading(false);
      }
    };

    loadFlowData();
  }, [item, isOpen]);

  const createPlaceholderFlow = (item: StoreItem): FlowData => {
    const centerX = 250;
    const centerY = 150;

    if (item.type === "COMPONENT") {
      // Single component node
      return {
        nodes: [
          {
            id: "component-1",
            type: "default",
            position: { x: centerX, y: centerY },
            data: {
              label: item.name,
              description: item.description,
            },
            style: {
              background: "#f3f4f6",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px",
              minWidth: "200px",
            },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
    } else {
      // Multi-node flow placeholder
      return {
        nodes: [
          {
            id: "start-1",
            type: "input",
            position: { x: 50, y: centerY },
            data: { label: "Input" },
            style: { background: "#dbeafe", border: "2px solid #3b82f6" },
          },
          {
            id: "process-1",
            type: "default",
            position: { x: centerX, y: centerY },
            data: { label: item.name },
            style: { background: "#f3f4f6", border: "2px solid #e5e7eb" },
          },
          {
            id: "output-1",
            type: "output",
            position: { x: 450, y: centerY },
            data: { label: "Output" },
            style: { background: "#dcfce7", border: "2px solid #22c55e" },
          },
        ],
        edges: [
          {
            id: "e1-2",
            source: "start-1",
            target: "process-1",
            type: "smoothstep",
          },
          {
            id: "e2-3",
            source: "process-1",
            target: "output-1",
            type: "smoothstep",
          },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      };
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              item.type === "COMPONENT"
                ? "bg-component-icon/10 text-component-icon"
                : "bg-flow-icon/10 text-flow-icon"
            )}>
              <IconComponent
                name={item.type === "COMPONENT" ? "ToyBrick" : "Group"}
                className="h-5 w-5"
              />
            </div>
            {item.name}
            <Badge variant={item.type === "COMPONENT" ? "default" : "secondary"}>
              {item.type}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Flow Visualization */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
            <div className="h-full relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <div className="flex items-center gap-2">
                    <IconComponent name="Loader2" className="h-5 w-5 animate-spin" />
                    <span>Loading preview...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <div className="text-center text-muted-foreground">
                    <IconComponent name="AlertCircle" className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {flowData && !loading && (
                <ReactFlow
                  nodes={flowData.nodes}
                  edges={flowData.edges}
                  defaultViewport={flowData.viewport}
                  fitView
                  attributionPosition="bottom-left"
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  panOnDrag={true}
                  zoomOnScroll={true}
                  zoomOnPinch={true}
                  className="bg-gray-50"
                  minZoom={0.1}
                  maxZoom={2}
                >
                  <Background color="#e5e7eb" gap={20} size={1} />
                  <Controls showInteractive={false} />
                  <MiniMap
                    nodeColor="#f3f4f6"
                    className="bg-white border border-gray-200"
                    pannable
                    zoomable
                  />
                </ReactFlow>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="w-80 flex-shrink-0">
            <div className="h-full overflow-y-auto">
              <div className="space-y-6 p-1">
                {/* Metadata */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Author</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.author?.username || item.author?.full_name || "Unknown"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Downloads</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.stats.downloads.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Likes</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.stats.likes.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">Updated</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.dates.updated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, index) =>
                        tag?.tags_id?.name ? (
                          <Badge
                            key={tag.tags_id.id || `tag-${index}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag.tags_id.name}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    onClick={() => onGrab(item)}
                    disabled={isGrabbing}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
                  >
                    {isGrabbing ? (
                      <>
                        <IconComponent name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                        Grabbing...
                      </>
                    ) : (
                      <>
                        <IconComponent name="Plus" className="mr-2 h-4 w-4" />
                        Grab {item.type === "COMPONENT" ? "Component" : "Flow"}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => onToggleFavorite(item.id)}
                    variant="outline"
                    className={cn(
                      "w-full",
                      isFavorite 
                        ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" 
                        : "hover:bg-primary/5 hover:border-primary/30"
                    )}
                  >
                    <IconComponent 
                      name="Heart" 
                      className={cn("mr-2 h-4 w-4", isFavorite ? "fill-current" : "")} 
                    />
                    {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
