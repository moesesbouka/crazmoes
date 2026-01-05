import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Chrome, Upload, Package } from "lucide-react";

export function AdminTools() {
  const downloadExtension = (extensionName: string) => {
    // Create a zip file download link
    const link = document.createElement("a");
    link.href = `/extensions/${extensionName}.zip`;
    link.download = `${extensionName}.zip`;
    link.click();
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
            >
              <Download className="h-4 w-4 mr-2" />
              Download Extension
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
            >
              <Download className="h-4 w-4 mr-2" />
              Download Extension
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
              <span className="text-foreground font-medium">Extract</span> the ZIP file to a folder on your computer
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Open Chrome</span> and go to{" "}
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs">chrome://extensions</code>
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Enable</span> "Developer mode" using the toggle in the top right
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Click</span> "Load unpacked" and select the extracted folder
            </li>
            <li className="text-muted-foreground">
              <span className="text-foreground font-medium">Pin</span> the extension to your toolbar for easy access
            </li>
          </ol>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" asChild>
              <a href="chrome://extensions" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Chrome Extensions
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
