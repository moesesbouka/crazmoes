import { useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Database } from "lucide-react";
import { useCRMStore, parseCSV, getDemoMessages } from "@/lib/crmStore";
import { toast } from "sonner";
import { format } from "date-fns";

export function CRMUpload() {
  const { messages, fileName, uploadTime, setMessages, clearData } = useCRMStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.error("No valid rows found in CSV");
          return;
        }
        setMessages(parsed, file.name);
        toast.success(`Imported ${parsed.length.toLocaleString()} messages`);
      } catch {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  }, [setMessages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) handleFile(file);
    else toast.error("Please upload a CSV file");
  }, [handleFile]);

  const loadDemo = () => {
    setMessages(getDemoMessages(), 'demo_data.csv');
    toast.success("Demo dataset loaded");
  };

  if (messages.length > 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {messages.length.toLocaleString()} rows · Uploaded {uploadTime ? format(new Date(uploadTime), "MMM d, h:mm a") : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { clearData(); toast.info("Data cleared"); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="border-dashed border-2 border-border/50 bg-card/30 hover:border-primary/50 transition-colors cursor-pointer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">Upload Messenger CSV</p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag & drop your exported CSV or click to browse
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); loadDemo(); }}>
            <Database className="h-4 w-4 mr-1" /> Load Demo Data
          </Button>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }} />
      </CardContent>
    </Card>
  );
}
