import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string>("");
  const [visitorName, setVisitorName] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get or create visitor ID
    let storedVisitorId = localStorage.getItem("chat_visitor_id");
    if (!storedVisitorId) {
      storedVisitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chat_visitor_id", storedVisitorId);
    }
    setVisitorId(storedVisitorId);

    // Check for existing conversation
    const storedConversationId = localStorage.getItem("chat_conversation_id");
    if (storedConversationId) {
      setConversationId(storedConversationId);
      setHasStartedChat(true);
      loadMessages(storedConversationId);
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const startChat = async () => {
    if (!visitorName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          visitor_id: visitorId,
          visitor_name: visitorName,
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      localStorage.setItem("chat_conversation_id", data.id);
      setHasStartedChat(true);
    } catch (error: any) {
      toast.error("Failed to start chat");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const messageText = newMessage;
    setNewMessage("");

    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "visitor",
        message: messageText,
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error("Failed to send message");
      setNewMessage(messageText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasStartedChat) {
        sendMessage();
      } else {
        startChat();
      }
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full hero-gradient shadow-glow hover:scale-110 transition-transform"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 shadow-card animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 hero-gradient rounded-t-lg">
            <CardTitle className="text-primary-foreground font-display text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat with Us
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {!hasStartedChat ? (
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Hi there! 👋 Enter your name to start chatting with us.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Your name"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={startChat} className="hero-gradient">
                    Start
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Send us a message! We'll respond as soon as possible.
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "visitor" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_type === "visitor"
                            ? "hero-gradient text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={sendMessage} size="icon" className="hero-gradient">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
