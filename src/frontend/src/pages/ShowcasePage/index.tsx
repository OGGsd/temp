import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import IconComponent from "../../components/common/genericIconComponent";
import ShadTooltip from "../../components/common/shadTooltipComponent";
import FlowPreviewDialog from "../../components/showcase/FlowPreviewDialog";
import { cn } from "../../utils/utils";
import { api } from "../../controllers/API";
import useAlertStore from "../../stores/alertStore";
import { usePostAddFlow } from "../../controllers/API/queries/flows/use-post-add-flow";
import { useFolderStore } from "../../stores/foldersStore";
import { FlowType } from "../../types/flow";
import { useGetFavoriteItemIds, useToggleFavorite } from "../../controllers/API/queries/favorites/use-favorites";

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

interface StoreData {
  flows: StoreItem[];
  components: StoreItem[];
  summary: {
    total_items: number;
    total_flows: number;
    total_components: number;
  };
}

export default function ShowcasePage(): JSX.Element {
  const navigate = useNavigate();
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const myCollectionId = useFolderStore((state) => state.myCollectionId);
  const addFlowMutation = usePostAddFlow();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [activeTab, setActiveTab] = useState("all");
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [authorFilter, setAuthorFilter] = useState("");
  const [showPrivateOnly, setShowPrivateOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24); // Show 24 items per page for better performance
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [grabbingItems, setGrabbingItems] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Database-backed favorites
  const { data: favoriteItemIds = [], isLoading: favoritesLoading } = useGetFavoriteItemIds();
  const toggleFavoriteMutation = useToggleFavorite();
  const favorites = new Set(favoriteItemIds);

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      setLoading(true);

      // FRONTEND-ONLY SOLUTION: Load store data directly from static files
      console.log('🔄 Loading store data from frontend files...');
      const response = await fetch('/store_components_converted/store_index.json');

      if (!response.ok) {
        throw new Error(`Failed to load store data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully loaded store data:', {
        total_items: data.summary?.total_items || 0,
        flows: data.summary?.total_flows || 0,
        components: data.summary?.total_components || 0
      });

      // Debug: Log first few items to verify structure
      if (data.flows && data.flows.length > 0) {
        console.log('📋 Sample flow:', data.flows[0]);
      }
      if (data.components && data.components.length > 0) {
        console.log('🧩 Sample component:', data.components[0]);
      }

      setStoreData(data);
    } catch (error) {
      console.error("❌ Failed to load store data:", error);
      setErrorData({
        title: "Failed to load showcase data",
        list: [
          "Could not load store data from frontend files",
          "Please ensure store_components_converted folder is accessible",
          error instanceof Error ? error.message : "Unknown error"
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced functionality functions
  const toggleFavorite = async (itemId: string) => {
    const item = [...(storeData?.flows || []), ...(storeData?.components || [])].find(i => i.id === itemId);
    if (!item) return;

    try {
      const result = await toggleFavoriteMutation.mutateAsync({
        item_id: itemId,
        item_type: item.type,
        item_name: item.name,
        item_description: item.description,
        item_author: item.author?.username || item.author?.full_name,
      });

      setSuccessData({ title: result.message });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setErrorData({
        title: "Failed to update favorites",
        list: ["Please try again later."]
      });
    }
  };

  const openPreview = (item: StoreItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  const grabFlow = async (item: StoreItem) => {
    if (grabbingItems.has(item.id)) return;

    setGrabbingItems(prev => new Set(prev).add(item.id));

    try {
      // Simulate loading flow data from the store
      const flowData = {
        name: `${item.name} (Grabbed)`,
        description: item.description,
        data: { nodes: [], edges: [], viewport: { zoom: 1, x: 0, y: 0 } }, // Placeholder data
        folder_id: myCollectionId || "",
        is_component: item.type === "COMPONENT",
        endpoint_name: undefined,
        icon: undefined,
        gradient: undefined,
        tags: undefined,
        mcp_enabled: undefined
      };

      await addFlowMutation.mutateAsync(flowData);

      setSuccessData({
        title: `Flow grabbed successfully! "${item.name}" has been added to your workspace`
      });

      // Navigate to the new flow
      setTimeout(() => navigate('/'), 1000);

    } catch (error) {
      console.error('Failed to grab flow:', error);
      setErrorData({
        title: "Failed to grab flow",
        list: ["Please try again later."]
      });
    } finally {
      setGrabbingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // No need for localStorage loading - using database-backed favorites

  // Sanitize filename to match how files were saved
  const sanitizeFilename = (name: string): string => {
    return name
      .replace(/[()]/g, '') // Remove parentheses: "(2)" → "2"
      .replace(/[<>:"/\\|?*]/g, '') // Remove other invalid filename characters
      .replace(/\s*\+\s*/g, '  ') // Replace " + " with double space: " + " → "  "
      .replace(/\s{3,}/g, '  ') // Replace 3+ spaces with double space
      .trim();
  };

  const handleDownload = async (item: StoreItem) => {
    if (downloadingItems.has(item.id)) return;

    setDownloadingItems(prev => new Set(prev).add(item.id));

    try {
      // FRONTEND-ONLY SOLUTION: Load files directly from static folder
      const folder = item.type === "FLOW" ? "flows" : "components";
      // Sanitize the filename to match how files were actually saved
      const sanitizedName = sanitizeFilename(item.name);
      const filePath = `/store_components_converted/${folder}/${item.id}_${sanitizedName}.json`;

      console.log(`🔄 Downloading ${item.type}: ${item.name} from ${filePath}`);

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Create download link
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Successfully downloaded: ${item.name}`);
      setSuccessData({
        title: `${item.type === "FLOW" ? "Flow" : "Component"} downloaded successfully!`
      });
    } catch (error) {
      console.error("❌ Download failed:", error);
      setErrorData({
        title: "Download failed",
        list: [
          `Could not download ${item.name}`,
          error instanceof Error ? error.message : "Unknown error",
          "Please try again later"
        ]
      });
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Get all unique tags for filtering
  const allTags = useMemo(() => {
    if (!storeData) return [];
    const tagSet = new Set<string>();
    [...storeData.flows, ...storeData.components].forEach(item => {
      // Handle items with tags safely
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          // Ensure tag has the expected structure
          if (tag && tag.tags_id && tag.tags_id.name) {
            tagSet.add(tag.tags_id.name);
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [storeData]);

  // Get all unique authors for filtering
  const allAuthors = useMemo(() => {
    if (!storeData) return [];
    const authorSet = new Set<string>();
    [...storeData.flows, ...storeData.components].forEach(item => {
      // Handle items with author data safely
      if (item.author && item.author.username) {
        authorSet.add(item.author.username);
      }
    });
    return Array.from(authorSet).sort();
  }, [storeData]);

  const getFilteredItems = () => {
    if (!storeData) return [];

    let items: StoreItem[] = [];

    if (activeTab === "all") {
      items = [...storeData.flows, ...storeData.components];
    } else if (activeTab === "flows") {
      items = storeData.flows;
    } else if (activeTab === "components") {
      items = storeData.components;
    } else if (activeTab === "favorites") {
      // Show only favorited items
      const allItems = [...storeData.flows, ...storeData.components];
      items = allItems.filter(item => favorites.has(item.id));
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.author?.username && item.author.username.toLowerCase().includes(searchLower)) ||
        (item.tags && Array.isArray(item.tags) && item.tags.some(tag =>
          tag?.tags_id?.name && tag.tags_id.name.toLowerCase().includes(searchLower)
        )) ||
        (item.technical?.last_tested_version && item.technical.last_tested_version.toLowerCase().includes(searchLower))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      items = items.filter(item =>
        item.tags && Array.isArray(item.tags) && item.tags.some(tag =>
          tag?.tags_id?.name && selectedTags.includes(tag.tags_id.name)
        )
      );
    }

    // Apply author filter
    if (authorFilter) {
      items = items.filter(item =>
        item.author.username.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }

    // Apply private filter
    if (showPrivateOnly) {
      items = items.filter(item => item.technical?.private === true);
    }

    // Apply sorting
    if (sortBy === "popular") {
      items.sort((a, b) => (b.stats.likes + b.stats.downloads) - (a.stats.likes + a.stats.downloads));
    } else if (sortBy === "recent") {
      items.sort((a, b) => new Date(b.dates.updated).getTime() - new Date(a.dates.updated).getTime());
    } else if (sortBy === "alphabetical") {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "downloads") {
      items.sort((a, b) => b.stats.downloads - a.stats.downloads);
    } else if (sortBy === "likes") {
      items.sort((a, b) => b.stats.likes - a.stats.likes);
    }

    return items;
  };

  // Pagination logic
  const filteredItems = getFilteredItems();
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTags, authorFilter, showPrivateOnly, activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <IconComponent name="Library" className="h-16 w-16 text-muted-foreground/30" />
            <IconComponent name="Loader2" className="absolute inset-0 h-16 w-16 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Loading Showcase</h3>
            <p className="text-sm text-muted-foreground">
              Preparing 1600+ components and flows for you...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Professional Header */}
      <div className="border-b bg-white">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/flow")}
                className="flex items-center gap-2 hover:bg-gray-100 transition-colors text-gray-600"
              >
                <IconComponent name="ArrowLeft" className="h-4 w-4" />
                Back to Flow
              </Button>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Component & Flow Showcase
                </h1>
                <p className="text-gray-600 text-sm">
                  Discover and integrate from our collection of {storeData?.summary.total_items || 0} professional components and flows
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1 border-gray-200 text-gray-700">
                    <IconComponent name="ToyBrick" className="h-3 w-3 mr-1" />
                    {storeData?.summary.total_components || 0} Components
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 border-gray-200 text-gray-700">
                    <IconComponent name="Group" className="h-3 w-3 mr-1" />
                    {storeData?.summary.total_flows || 0} Flows
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Updated recently
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Filters */}
      <div className="border-b bg-gray-50">
        <div className="w-full px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px] max-w-md">
              <IconComponent name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search components and flows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <IconComponent name="X" className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="relative min-w-[200px]">
              <IconComponent name="User" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter by author..."
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 bg-white border-gray-200">
                <IconComponent name="ArrowUpDown" className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="downloads">Downloads</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-white border-gray-200">
                <IconComponent name="Filter" className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FLOW">Flows</SelectItem>
                <SelectItem value="COMPONENT">Components</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "transition-all duration-200 border-gray-200",
                showFavoritesOnly
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  : "hover:bg-gray-50 hover:border-gray-300 text-gray-700"
              )}
            >
              <IconComponent
                name="Heart"
                className={cn("mr-2 h-4 w-4", showFavoritesOnly ? "fill-current" : "")}
              />
              {showFavoritesOnly ? "Show All" : "Favorites"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="hover:bg-gray-50 hover:border-gray-300 border-gray-200 text-gray-700"
            >
              <IconComponent
                name={viewMode === "grid" ? "List" : "Grid3X3"}
                className="mr-2 h-4 w-4"
              />
              {viewMode === "grid" ? "List" : "Grid"}
            </Button>
          </div>


        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b px-6">
            <TabsList>
              <TabsTrigger value="all">All ({filteredItems.length})</TabsTrigger>
              <TabsTrigger value="flows">Flows ({storeData?.flows.length || 0})</TabsTrigger>
              <TabsTrigger value="components">Components ({storeData?.components.length || 0})</TabsTrigger>
              <TabsTrigger value="favorites" className="relative">
                <IconComponent name="Heart" className="mr-2 h-4 w-4" />
                Favorites ({favorites.size})
                {favorites.size > 0 && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="h-full overflow-auto">
            <div className="px-6 py-4 space-y-4">
              {/* Results Info */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedItems.length} of {filteredItems.length} items
                  {filteredItems.length !== (storeData?.summary.total_items || 0) &&
                    ` (filtered from ${storeData?.summary.total_items || 0} total)`
                  }
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>

              {/* Items Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {paginatedItems.map((item) => (
                  <ShowcaseCard
                    key={item.id}
                    item={item}
                    onDownload={() => handleDownload(item)}
                    isDownloading={downloadingItems.has(item.id)}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.has(item.id)}
                    onPreview={openPreview}
                    onGrab={grabFlow}
                    isGrabbing={grabbingItems.has(item.id)}
                  />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <IconComponent name="Search" className="mx-auto h-12 w-12 mb-4" />
                    <p>No items found matching your filters.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedTags([]);
                        setAuthorFilter("");
                        setShowPrivateOnly(false);
                      }}
                      className="mt-2"
                    >
                      Clear all filters
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Flow Preview Dialog */}
      <FlowPreviewDialog
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onGrab={(item) => {
          grabFlow(item);
          setIsPreviewOpen(false);
        }}
        onToggleFavorite={toggleFavorite}
        isFavorite={previewItem ? favorites.has(previewItem.id) : false}
        isGrabbing={previewItem ? grabbingItems.has(previewItem.id) : false}
      />
    </div>
  );
}

interface ShowcaseCardProps {
  item: StoreItem;
  onDownload: () => void;
  isDownloading: boolean;
  onToggleFavorite: (itemId: string) => void;
  isFavorite: boolean;
  onPreview: (item: StoreItem) => void;
  onGrab: (item: StoreItem) => void;
  isGrabbing: boolean;
}

function ShowcaseCard({
  item,
  onDownload,
  isDownloading,
  onToggleFavorite,
  isFavorite,
  onPreview,
  onGrab,
  isGrabbing
}: ShowcaseCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="group relative flex h-80 flex-col justify-between overflow-hidden hover:shadow-md transition-all duration-200 border-gray-200 hover:border-gray-300 bg-white">

      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-md",
              item.type === "COMPONENT"
                ? "bg-blue-50 text-blue-600"
                : "bg-green-50 text-green-600"
            )}>
              <IconComponent
                name={item.type === "COMPONENT" ? "ToyBrick" : "Group"}
                className="h-4 w-4"
              />
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium border",
                item.type === "COMPONENT"
                  ? "border-blue-200 text-blue-700 bg-blue-50"
                  : "border-green-200 text-green-700 bg-green-50"
              )}
            >
              {item.type}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(item.id)}
            className={cn(
              "h-8 w-8 p-0 transition-all duration-200",
              isFavorite
                ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
            )}
          >
            <IconComponent
              name="Heart"
              className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
            />
          </Button>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-base leading-tight font-semibold text-gray-900">
            <div className="truncate group-hover:text-blue-600 transition-colors">
              {item.name}
            </div>
          </CardTitle>

          <CardDescription className="line-clamp-2 text-sm leading-relaxed text-gray-600">
            {item.description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3 space-y-3">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-gray-600">
              <IconComponent name="Download" className="h-3 w-3" />
              <span className="font-medium">{item.stats.downloads}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <IconComponent name="Heart" className="h-3 w-3" />
              <span className="font-medium">{item.stats.likes}</span>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <IconComponent name="User" className="h-3 w-3" />
            <span>by {item.author.username}</span>
          </div>
        </div>


      </CardContent>

      <CardFooter className="pt-3 pb-4">
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => onPreview(item)}
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-gray-50 hover:border-gray-300 border-gray-200 text-gray-700"
          >
            <IconComponent name="Eye" className="mr-2 h-4 w-4" />
            Preview
          </Button>

          <Button
            onClick={() => onGrab(item)}
            disabled={isGrabbing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            size="sm"
          >
            {isGrabbing ? (
              <>
                <IconComponent name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <IconComponent name="Plus" className="mr-2 h-4 w-4" />
                Add to Flow
              </>
            )}
          </Button>
        </div>

        {/* Download Button */}
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          variant="outline"
          className="w-full group/btn hover:shadow-md transition-all duration-200 hover:bg-primary/5 hover:border-primary/30"
          size="sm"
        >
          {isDownloading ? (
            <>
              <IconComponent name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <IconComponent name="Download" className="mr-2 h-4 w-4 group-hover/btn:animate-bounce" />
              <span>Download JSON</span>
              <IconComponent name="ExternalLink" className="ml-2 h-3 w-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
