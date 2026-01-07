import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Chrome, Upload, Package, Loader2, CheckCircle } from "lucide-react";
import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";

// Extension metadata - versions are read dynamically from manifest.json files
const EXTENSIONS = {
  "fb-marketplace-lister": {
    name: "FB Marketplace Lister",
    description: "Copy product data from shopping sites and create Facebook Marketplace listings with one click",
    icon: Upload,
    iconColor: "#1877f2",
    iconLetter: "L",
    files: [
      "manifest.json",
      "popup.html",
      "popup.js",
      "background.js",
      "content-scraper.js",
      "content-paster.js",
      "styles.css"
    ]
  },
  "fb-marketplace-importer": {
    name: "FB Marketplace Importer",
    description: "Backup your entire Facebook Marketplace inventory to prevent data loss",
    icon: Package,
    iconColor: "#28a745",
    iconLetter: "I",
    files: [
      "manifest.json",
      "popup.html",
      "popup.js",
      "background.js",
      "content-importer.js",
      "styles.css"
    ]
  }
};

type ExtensionKey = keyof typeof EXTENSIONS;

export function AdminTools() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, string>>({});

  // Fetch versions from manifest.json files on mount
  useEffect(() => {
    const fetchVersions = async () => {
      const newVersions: Record<string, string> = {};
      for (const key of Object.keys(EXTENSIONS)) {
        try {
          const response = await fetch(`/extensions/${key}/manifest.json`, { cache: "no-store" });
          if (response.ok) {
            const manifest = await response.json();
            newVersions[key] = manifest.version || "unknown";
          }
        } catch (e) {
          console.error(`Failed to fetch version for ${key}:`, e);
          newVersions[key] = "error";
        }
      }
      setVersions(newVersions);
    };
    fetchVersions();
  }, []);

  const downloadExtension = async (extensionName: ExtensionKey) => {
    setDownloading(extensionName);
    
    try {
      const extension = EXTENSIONS[extensionName];
      const zip = new JSZip();
      const basePath = `/extensions/${extensionName}`;
      
      // Fetch all extension files from public/extensions
      let manifestVersion = "unknown";
      
      for (const fileName of extension.files) {
        try {
            const response = await fetch(`${basePath}/${fileName}`, { cache: "no-store" });
            if (!response.ok) {
            console.warn(`Could not fetch ${fileName}: ${response.status}`);
            continue;
          }
          const content = await response.text();
          zip.file(fileName, content);
          
          // Extract version from manifest
          if (fileName === "manifest.json") {
            try {
              const manifest = JSON.parse(content);
              manifestVersion = manifest.version || "unknown";
            } catch (e) {
              console.error("Failed to parse manifest.json:", e);
            }
          }
        } catch (e) {
          console.error(`Error fetching ${fileName}:`, e);
        }
      }

      // Fetch icons
      const iconSizes = [16, 48, 128];
      const iconsFolder = zip.folder("icons");
      
      for (const size of iconSizes) {
        try {
          const response = await fetch(`${basePath}/icons/icon${size}.png`, { cache: "no-store" });
          if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            iconsFolder?.file(`icon${size}.png`, arrayBuffer);
          } else {
            // Generate fallback icon if not found
            const pngData = createMinimalPng(size, extension.iconColor, extension.iconLetter);
            iconsFolder?.file(`icon${size}.png`, pngData, { base64: true });
          }
        } catch (e) {
          // Generate fallback icon on error
          const pngData = createMinimalPng(size, extension.iconColor, extension.iconLetter);
          iconsFolder?.file(`icon${size}.png`, pngData, { base64: true });
        }
      }

      // Add build-info.json with provenance data
      const buildInfo = {
        extension: extensionName,
        version: manifestVersion,
        builtAt: new Date().toISOString(),
        source: "Crazy Moe's Admin Tools"
      };
      zip.file("build-info.json", JSON.stringify(buildInfo, null, 2));

      // Generate timestamp for filename
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
      const zipName = `${extensionName}-v${manifestVersion}-${timestamp}.zip`;

      // Generate and download the ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadComplete(extensionName);
      toast({
        title: `Downloaded ${extension.name} v${manifestVersion}`,
        description: `${zipName} — Extract and load unpacked in Chrome.`,
      });

      setTimeout(() => setDownloadComplete(null), 3000);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error creating the extension package.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* FB Lister Extension */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  FB Marketplace Lister
                  {versions["fb-marketplace-lister"] && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      v{versions["fb-marketplace-lister"]}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  Copy product data from shopping sites and create Facebook Marketplace listings with one click
                </CardDescription>
              </div>
              <Badge variant="outline">Chrome Extension</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Features:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Floating "Copy to Facebook" button on product pages</li>
                <li>Auto-formats titles (65-75 chars optimal)</li>
                <li>Automatically halves price for Marketplace</li>
                <li>Copies all product images</li>
                <li>"Paste Data" button on FB Marketplace create page</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Supported Sites:</h4>
              <p className="text-muted-foreground">Amazon, eBay, Walmart, Best Buy, Target, and more</p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => downloadExtension("fb-marketplace-lister")}
              disabled={downloading === "fb-marketplace-lister"}
            >
              {downloading === "fb-marketplace-lister" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : downloadComplete === "fb-marketplace-lister" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Extension
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* FB Importer Extension */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  FB Marketplace Importer
                  {versions["fb-marketplace-importer"] && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      v{versions["fb-marketplace-importer"]}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  Backup your entire Facebook Marketplace inventory to prevent data loss
                </CardDescription>
              </div>
              <Badge variant="outline">Chrome Extension</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-medium">Features:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Imports all active Marketplace listings</li>
                <li>Captures titles, descriptions, prices, images</li>
                <li>Saves to your inventory database</li>
                <li>Searchable & exportable backup</li>
                <li>Protection against account loss</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Why this matters:</strong> Facebook has no export tool. If your account is disabled, you lose everything.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => downloadExtension("fb-marketplace-importer")}
              disabled={downloading === "fb-marketplace-importer"}
            >
              {downloading === "fb-marketplace-importer" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : downloadComplete === "fb-marketplace-importer" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Extension
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Installation Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Download</span> the extension ZIP file using the button above
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Extract</span> the ZIP file to a <strong>new, empty folder</strong> on your computer
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Open Chrome</span> and go to{" "}
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs">chrome://extensions</code>
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Enable</span> "Developer mode" using the toggle in the top right
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Remove</span> any old version of the extension first
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Click</span> "Load unpacked" and select the extracted folder
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Verify</span> the version number shown matches the downloaded version
            </li>
          </ol>

          <div className="p-4 bg-muted/50 rounded-lg mt-4">
            <h4 className="font-medium text-sm mb-2">Quick Test:</h4>
            <p className="text-sm text-muted-foreground">
              After installing the <strong>FB Marketplace Lister</strong>, visit any product page on Amazon/BestBuy/etc 
              and look for the floating "Copy to Facebook" button. After clicking, a toast will show what was captured.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to create a minimal valid PNG
function createMinimalPng(size: number, color: string, letter: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const radius = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + size * 0.05);
  }
  
  return canvas.toDataURL('image/png').split(',')[1];
}
