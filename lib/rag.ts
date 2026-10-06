import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
export function retrievalQuery(history: { role: string; content: string }[]) {
  return history.filter(message => message.role === "user").slice(-3).map(message => message.content).join("\n").slice(-8000);
}
export function retrievalMessages(query: string, context: string): ChatCompletionMessageParam[] {
  return [
    { role: "assistant", content: null, tool_calls: [{ id: "initial_document_search", type: "function", function: { name: "search_study_materials", arguments: JSON.stringify({ query }) } }] },
    { role: "tool", tool_call_id: "initial_document_search", content: context },
  ];
}
