import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export function AdminChatConsole() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("admin-chats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages(selectedConversation.id);

    const channel = supabase
      .channel(`admin-chat-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data) setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage;
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      conversation_id: selectedConversation.id,
      sender_type: "admin",
      message: messageText,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Conversations List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-muted-foreground text-sm text-center">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 text-left border-b hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {conv.visitor_name || "Anonymous"}
                      </span>
                    </div>
                    <Badge variant={conv.status === "open" ? "default" : "secondary"}>
                      {conv.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(conv.created_at), "MMM d, h:mm a")}
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            {selectedConversation
              ? `Chat with ${selectedConversation.visitor_name || "Anonymous"}`
              : "Select a conversation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedConversation ? (
            <>
              <div className="h-[400px] overflow-y-auto mb-4 p-4 bg-muted/30 rounded-lg space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_type === "admin" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.sender_type === "admin"
                          ? "hero-gradient text-primary-foreground"
                          : "bg-card border"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type your response..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <Button onClick={sendMessage} className="hero-gradient">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Select a conversation to start replying
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
