import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Search, Download, Heart, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FlowPreviewComponent from "@/components/common/flowPreviewComponent";
import { cn } from "@/utils/utils";
import useAlertStore from "@/stores/alertStore";
import useAddFlow from "@/hooks/flows/use-add-flow";
import { FlowType } from "@/types/flow";

interface StoreItem {
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
    downloaded: string;
  };
  tags: Array<{
    tags_id: {
      name: string;
      id: string;
    };
  }>;
  conversion?: {
    converted_at: string;
    converted_from: string;
    converted_to: string;
    conversions_made: number;
  };
}

interface StoreData {
  summary: {
    total_items: number;
    total_flows: number;
    total_components: number;
    downloaded_at: string;
  };
  flows: StoreItem[];
  components: StoreItem[];
  conversion_info: {
    converted_at: string;
    converted_from: string;
    converted_to: string;
    original_source: string;
  };
}

export default function AxieStudioStorePage(): JSX.Element {
  const { id } = useParams();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [filteredItems, setFilteredItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "FLOW" | "COMPONENT">("ALL");
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "alphabetical" | "downloads">("popular");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importingItems, setImportingItems] = useState<Set<string>>(new Set());

  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const addFlow = useAddFlow();

  // Load store data
  useEffect(() => {
    const loadStoreData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/store/');
        const data: StoreData = await response.json();
        setStoreData(data);
        
        // Combine flows and components
        const allItems = [...data.flows, ...data.components];
        setFilteredItems(allItems);
      } catch (error) {
        console.error('Failed to load store data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, []);

  // Filter and sort items
  useEffect(() => {
    if (!storeData) return;

    let items = [...storeData.flows, ...storeData.components];

    // Filter by type
    if (selectedType !== "ALL") {
      items = items.filter(item => item.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.author.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.tags_id.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort items
    items.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.stats.likes + b.stats.downloads) - (a.stats.likes + a.stats.downloads);
        case "recent":
          return new Date(b.dates.updated).getTime() - new Date(a.dates.updated).getTime();
        case "downloads":
          return b.stats.downloads - a.stats.downloads;
        case "alphabetical":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredItems(items);
  }, [storeData, searchTerm, selectedType, sortBy]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleItemClick = (item: StoreItem) => {
    setSelectedItem(item);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedItem(null);
  };

  const handleImport = async (item: StoreItem) => {
    if (importingItems.has(item.id)) return; // Prevent double imports

    try {
      setImportingItems(prev => new Set(prev).add(item.id));

      // Fetch the actual flow/component data
      const response = await fetch(`/api/v1/store/${item.type.toLowerCase()}/${item.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${item.type.toLowerCase()}: ${response.statusText}`);
      }

      const itemData = await response.json();

      if (item.type === "FLOW") {
        // Convert store item to FlowType format
        const flowToImport: FlowType = {
          id: itemData.id || item.id,
          name: `${item.name} (from Store)`,
          description: item.description,
          data: itemData.data || itemData,
          is_component: false,
          updated_at: new Date().toISOString(),
          folder_id: undefined,
          user_id: undefined,
          endpoint_name: null
        };

        // Add flow to user's workspace
        const newFlowId = await addFlow({ flow: flowToImport });

        setSuccessData({
          title: `🎉 Flow "${item.name}" imported successfully! You can now find it in your flows.`,
        });

        // Optional: Auto-redirect to the new flow after a delay
        setTimeout(() => {
          if (newFlowId) {
            window.open(`/flow/${newFlowId}`, '_blank');
          }
        }, 2000);
      } else {
        // For components, we could add them to the component library
        // For now, show a message that components aren't supported yet
        setErrorData({
          title: "Component Import",
          list: ["Component import is not yet supported. Only flows can be imported."],
        });
      }

    } catch (error: any) {
      console.error('Failed to import item:', error);
      setErrorData({
        title: "Import Failed",
        list: [`Failed to import ${item.name}: ${error?.message || 'Unknown error'}`],
      });
    } finally {
      setImportingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AS</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">Axie Studio Store</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AS</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">Axie Studio Store</span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <button className="text-gray-900 font-medium border-b-2 border-black pb-1">
                  My Library
                </button>
                <button className="text-gray-500 hover:text-gray-900 transition-colors">
                  Store
                </button>
                <button className="text-gray-500 hover:text-gray-900 transition-colors">
                  Settings
                </button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-500">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Axie Studio Store</h1>
          <p className="text-gray-600">Search flows and components from the community</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search flows and components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-black focus:ring-black"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => setSelectedType("ALL")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    selectedType === "ALL"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedType("FLOW")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    selectedType === "FLOW"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  )}
                >
                  Flows
                </button>
                <button
                  onClick={() => setSelectedType("COMPONENT")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    selectedType === "COMPONENT"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-600 hover:text-black"
                  )}
                >
                  Components
                </button>
              </div>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Showing {filteredItems.length} of {storeData?.summary.total_items || 0} items
          </p>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      by {item.author.username}
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0",
                    item.type === "FLOW"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700"
                  )}>
                    {item.type === "FLOW" ? "FLOW" : "COMP"}
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Card Content */}
              <div className="px-4 py-3 space-y-3">
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Download className="h-3 w-3" />
                      <span>{item.stats.downloads}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-3 w-3" />
                      <span>{item.stats.likes}</span>
                    </div>
                  </div>
                  <span>{formatDate(item.dates.updated)}</span>
                </div>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.tags_id.id}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag.tags_id.name}
                      </span>
                    ))}
                    {item.tags.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{item.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemClick(item)}
                    className="flex-1 text-xs border-gray-200 hover:border-gray-300"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleImport(item)}
                    disabled={importingItems.has(item.id)}
                    className={cn(
                      "flex-1 text-xs",
                      item.type === "FLOW"
                        ? "bg-black hover:bg-gray-800 text-white"
                        : "bg-gray-600 hover:bg-gray-700 text-white"
                    )}
                  >
                    {importingItems.has(item.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        {item.type === "FLOW" ? "Grab Flow" : "Import"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              No items found matching your criteria.
            </div>
          </div>
        )}

        {/* Flow Preview Modal */}
        {selectedItem && (
          <FlowPreviewComponent
            isOpen={showPreview}
            onClose={handleClosePreview}
            item={selectedItem}
            onImport={handleImport}
          />
        )}
      </div>
    </div>
  );
}
