import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Layers3, Workflow, WandSparkles, Download, PlayCircle } from "lucide-react";

const platformCards = [
  {
    name: "Crosslist-style flow",
    strengths: [
      "Marketplace → central inventory → Facebook pipeline is reliable for large catalogs",
      "Supports bulk editing, templates, and AI enrichment before posting",
      "Best fit for multi-channel resellers that need auditability and retries"
    ],
    constraints: [
      "No true file-to-Facebook direct import",
      "Requires connected source marketplace and Facebook account",
      "Manual sold-item delisting unless you add sync automations"
    ],
    fit: "Best default architecture for scale + control"
  },
  {
    name: "ZeeDrop-style flow",
    strengths: [
      "CSV-first workflow is fast for dropshipping catalogs",
      "Chrome extension automation enables quick queue-based posting",
      "Simple setup for operators with repeatable templates"
    ],
    constraints: [
      "Higher risk of Facebook rate-limit/automation flags",
      "Browser-profile management needed for multiple FB accounts",
      "Limited central catalog governance"
    ],
    fit: "Best for fast direct posting from suppliers"
  },
  {
    name: "ListPerfectly-style flow",
    strengths: [
      "Catalog-centered workflow plus direct crosslist option",
      "Bulk import + bulk crosslist + relist/delist lifecycle support",
      "Good balance of speed and inventory management"
    ],
    constraints: [
      "Extension-dependent posting reliability",
      "Facebook still posts item-by-item behind the scenes",
      "Personal Facebook account requirement"
    ],
    fit: "Best hybrid model (catalog + direct mode)"
  }
];

const buildPlan = [
  "Create a unified listing schema: title, description, price, category, condition, location, shipping profile, image URLs, source IDs, and posting status.",
  "Build connectors to import active listings from at least one source marketplace first (eBay or Mercari) and normalize records into your central inventory.",
  "Add preparation tooling: bulk templates, AI description generation, price suggestions, JPEG validation, and duplicate detection by title + source ID.",
  "Implement Facebook posting queue with rate limits, retries, and per-listing logs. Treat every listing as an individual post executed by background workers.",
  "Expose lifecycle controls in dashboard: bulk post, relist, delist, retry failures, and matched-listing linking to avoid duplicate cross-posts.",
  "Track economics: credits/subscription usage, post success rate, median posting time, and queue throughput."
];

const quickStart = [
  "Download the CSV template and prepare 20-50 listings first (keep images as JPEG URLs).",
  "Create one shipping profile and one location profile for Facebook defaults.",
  "Import listings into your central inventory page.",
  "Run Preflight Validation (required fields + blocked-word scan + image URL check).",
  "Use bulk edit to apply category/condition/shipping defaults.",
  "Queue all validated items and start bulk autopost.",
  "Watch status: posted / retry / failed and rerun failed jobs only.",
  "After first successful batch, scale in waves (100, then 250, then 500)."
];

const requiredFields = [
  ["title", "Yes", "Short, keyword-rich, no spammy caps"],
  ["price", "Yes", "Numeric only, no symbols"],
  ["description", "Yes", "Include condition + pickup/shipping notes"],
  ["category", "Yes", "Use Facebook-aligned category mapping"],
  ["condition", "Yes", "New/Used options normalized"],
  ["image_urls", "Yes", "Comma-separated HTTPS URLs, JPEG preferred"],
  ["location", "Yes", "City/state or profile-based default"],
  ["shipping_method", "Yes", "Local pickup or ship-yourself profile"],
  ["quantity", "Optional", "Useful for replenishable SKUs"],
  ["tags", "Optional", "Internal filtering only"],
];

export function AdminBulkImportBlueprint() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PlayCircle className="h-5 w-5" />
            Plug-and-Play Launch Pack
          </CardTitle>
          <CardDescription>
            If you want the fastest usable rollout, start here. This is the shortest path from zero to live bulk posting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Use the template.</li>
            <li>Import to inventory.</li>
            <li>Run validation.</li>
            <li>Bulk post in controlled waves.</li>
          </ol>
          <Button asChild>
            <a href="/templates/facebook-bulk-import-template.csv" download>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5" />
            Facebook Marketplace Bulk Import Blueprint
          </CardTitle>
          <CardDescription>
            Built from your platform research: this is the recommended operating model and implementation order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
            <p className="font-medium">Recommended core model</p>
            <p>
              Use a <strong>central inventory hub</strong> with marketplace imports, then run <strong>background autopost queues</strong> for Facebook.
              This gives you Crosslist-level control, while still allowing ZeeDrop-style CSV ingestion as an optional accelerator.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {platformCards.map((platform) => (
              <Card key={platform.name} className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{platform.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">{platform.fit}</Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Strengths</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {platform.strengths.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Constraints</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {platform.constraints.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="h-5 w-5" />
            30-Minute Operator Runbook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {quickStart.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-md border bg-background p-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Field Mapping (Copy This Exactly)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {requiredFields.map(([field, required, notes]) => (
                  <tr key={field} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">{field}</td>
                    <td className="px-3 py-2">{required}</td>
                    <td className="px-3 py-2 text-muted-foreground">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <WandSparkles className="h-5 w-5" />
            Build Order (Engineering)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {buildPlan.map((step, i) => (
              <li key={step} className="flex items-start gap-3 rounded-md border bg-background p-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
