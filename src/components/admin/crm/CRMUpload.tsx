import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Database, FolderOpen } from "lucide-react";
import { useCRMStore, parseCSV, getDemoMessages, type CRMMessage } from "@/lib/crmStore";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Parse Facebook Messenger JSON export files into CRMMessage format.
 * Handles both single message_*.json files and arrays of them.
 */
function parseFBJson(jsonText: string, fileName: string): CRMMessage[] {
  const data = JSON.parse(jsonText);
  const msgs: CRMMessage[] = [];

  // Facebook exports have { participants, messages, title, thread_path, ... }
  const conversations = Array.isArray(data) ? data : [data];

  for (const conv of conversations) {
    if (!conv.messages || !Array.isArray(conv.messages)) continue;
    const threadPath = conv.thread_path || conv.title || fileName;
    const title = conv.title || '';
    const participants = (conv.participants || []).map((p: any) => p.name || p);

    for (let i = 0; i < conv.messages.length; i++) {
      const m = conv.messages[i];
      const sender = m.sender_name || m.sender || '';
      const text = m.content || m.message_text || '';
      const ts = m.timestamp_ms || (m.timestamp ? m.timestamp * 1000 : 0);
      const d = new Date(ts);
      const isSystem = !sender || m.type === 'Generic' && !text;
      const attachments = (m.photos?.length || 0) + (m.videos?.length || 0) + (m.files?.length || 0) + (m.audio_files?.length || 0) + (m.gifs?.length || 0);

      msgs.push({
        conversation_title: title,
        listing_title: title,
        thread_path: threadPath,
        conversation_slug: threadPath.replace(/[^a-z0-9]/gi, '_'),
        customer_name: participants.find((p: string) => p !== sender) || sender,
        sender: decodeUTF8(sender),
        message_text: decodeUTF8(text),
        message_date: ts ? d.toISOString().split('T')[0] : '',
        message_time: ts ? d.toTimeString().slice(0, 8) : '',
        timestamp_iso: ts ? d.toISOString() : '',
        timestamp_ms: ts,
        month_bucket: ts ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '',
        product: title || 'Unclassified',
        system_message: isSystem ? 1 : 0,
        owner_message: 0, // Will be refined after loading based on ownerName setting
        attachments_count: attachments,
        reactions_count: m.reactions?.length || 0,
        is_unsent: m.is_unsent ? 1 : 0,
        source_file: fileName,
        source_folder: 'json_import',
        message_index_in_file: i,
      });
    }
  }
  return msgs;
}

/** Facebook exports use UTF-8 bytes encoded as Latin-1 */
function decodeUTF8(str: string): string {
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

export function CRMUpload() {
  const { messages, fileName, uploadTime, setMessages, clearData } = useCRMStore();
  const csvRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const handleCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) { toast.error("No valid rows found in CSV"); return; }
        setMessages(parsed, file.name);
        toast.success(`Imported ${parsed.length.toLocaleString()} messages from CSV`);
      } catch { toast.error("Failed to parse CSV file"); }
    };
    reader.readAsText(file);
  }, [setMessages]);

  const handleJSON = useCallback((files: FileList) => {
    const allMsgs: CRMMessage[] = [];
    let processed = 0;
    const total = files.length;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = parseFBJson(text, file.name);
          allMsgs.push(...parsed);
        } catch (err) {
          console.warn(`Skipped ${file.name}:`, err);
        }
        processed++;
        if (processed === total) {
          if (allMsgs.length === 0) { toast.error("No valid messages found in JSON files"); return; }
          setMessages(allMsgs, `${total} JSON file${total > 1 ? 's' : ''}`);
          toast.success(`Imported ${allMsgs.toLocaleString().length > 0 ? allMsgs.length.toLocaleString() : '0'} messages from ${total} JSON file${total > 1 ? 's' : ''}`);
        }
      };
      reader.readAsText(file);
    });
  }, [setMessages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const first = files[0];
    if (first.name.endsWith('.csv') || first.type === 'text/csv') {
      handleCSV(first);
    } else if (first.name.endsWith('.json') || first.type === 'application/json') {
      handleJSON(files);
    } else {
      toast.error("Please upload CSV or JSON files");
    }
  }, [handleCSV, handleJSON]);

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
      onClick={() => csvRef.current?.click()}
    >
      <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">Upload Messenger Data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag & drop your CSV or Facebook JSON export files
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); csvRef.current?.click(); }}>
            <Upload className="h-4 w-4 mr-1" /> CSV File
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); jsonRef.current?.click(); }}>
            <FolderOpen className="h-4 w-4 mr-1" /> JSON Files
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); loadDemo(); }}>
            <Database className="h-4 w-4 mr-1" /> Load Demo
          </Button>
        </div>
        <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCSV(file);
        }} />
        <input ref={jsonRef} type="file" accept=".json" multiple className="hidden" onChange={(e) => {
          if (e.target.files?.length) handleJSON(e.target.files);
        }} />
      </CardContent>
    </Card>
  );
}
