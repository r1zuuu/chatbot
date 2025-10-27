"use client";

import { useState, useRef } from "react";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlusIcon,
  MessageSquareIcon,
  Trash2Icon,
  MenuIcon,
  SparklesIcon,
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const chatHistory = currentSession?.messages || [];

  const handleSendMessage = async (promptMessage: PromptInputMessage) => {
    const hasText = Boolean(promptMessage.text);
    const hasAttachments = Boolean(promptMessage.files?.length);

    if (!(hasText || hasAttachments) || isLoading) return;

    const userMessage = promptMessage.text?.trim() || "Sent with attachments";
    setMessage("");
    setIsLoading(true);
    setStreamingContent("");

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: sessionId,
        title:
          userMessage.slice(0, 30) + (userMessage.length > 30 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s
      )
    );

    try {
      abortControllerRef.current = new AbortController();

      const currentMessages = [
        ...(sessions.find((s) => s.id === sessionId)?.messages || []),
        userMsg,
      ];

      const messagesForAPI = currentMessages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messagesForAPI,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("0:")) {
              const content = line.slice(2).replace(/^"(.*)"$/, "$1");
              fullResponse += content;
              setStreamingContent(fullResponse);
            }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        type: "assistant",
        content: fullResponse,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, assistantMsg] }
            : s
        )
      );
      setStreamingContent("");
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error:", error);
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          type: "assistant",
          content:
            "Sorry, there was an error processing your request. Please make sure your OpenAI API key is set in .env.local file.",
          timestamp: new Date(),
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, errorMsg] }
              : s
          )
        );
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessage("");
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r bg-card overflow-hidden flex flex-col`}
      >
        <div className="p-3 border-b">
          <Button
            onClick={startNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <PlusIcon className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  currentSessionId === session.id ? "bg-accent" : ""
                }`}
              >
                <MessageSquareIcon className="h-4 w-4 shrink-0" />
                <span className="text-sm flex-1 truncate">{session.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => deleteSession(session.id, e)}
                >
                  <Trash2Icon className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="text-xs text-muted-foreground text-center">
            ChatGPT Clone
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b p-3 h-14 flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">ChatGPT</h1>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                  <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h2 className="text-3xl font-semibold mb-2">
                    How can I help you today?
                  </h2>
                </div>

                <Suggestions className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Suggestion
                    onClick={() => setMessage("What can you help me with?")}
                    suggestion="What can you help me with?"
                  />
                  <Suggestion
                    onClick={() =>
                      setMessage("Explain quantum computing in simple terms")
                    }
                    suggestion="Explain quantum computing in simple terms"
                  />
                  <Suggestion
                    onClick={() =>
                      setMessage("Help me write a Python function")
                    }
                    suggestion="Help me write a Python function"
                  />
                  <Suggestion
                    onClick={() => setMessage("Give me creative writing ideas")}
                    suggestion="Give me creative writing ideas"
                  />
                </Suggestions>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`py-6 ${
                    msg.type === "assistant" ? "bg-secondary/30" : ""
                  }`}
                >
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    <MessageAvatar
                      src={
                        msg.type === "user"
                          ? "https://api.dicebear.com/7.x/avataaars/svg?seed=User"
                          : "https://api.dicebear.com/7.x/bottts/svg?seed=ChatGPT"
                      }
                      name={msg.type === "user" ? "You" : "AI"}
                      className="shrink-0"
                    />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="font-semibold text-sm">
                        {msg.type === "user" ? "You" : "ChatGPT"}
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(isLoading || streamingContent) && (
                <div className="py-6 bg-secondary/30">
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    <MessageAvatar
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=ChatGPT"
                      name="AI"
                      className="shrink-0"
                    />
                    <div className="flex-1 pt-1">
                      <div className="font-semibold text-sm mb-2">ChatGPT</div>
                      {streamingContent ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {streamingContent}
                          <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader />
                          <span className="text-sm text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            <PromptInput
              onSubmit={handleSendMessage}
              className="w-full relative"
            >
              <PromptInputTextarea
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                placeholder="Message ChatGPT..."
                className="pr-12 min-h-14 resize-none"
              />
              <PromptInputSubmit
                className="absolute bottom-2 right-2"
                disabled={!message.trim() || isLoading}
                status={isLoading ? "streaming" : "ready"}
              />
            </PromptInput>
            <p className="text-xs text-center text-muted-foreground mt-2">
              ChatGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
