import { parse } from "mathjs";
export function calculate(expression: string): string {
  if (expression.length > 300) throw new Error("Expression is too long.");
  const tree = parse(expression);
  tree.traverse(node => {
    if (!["OperatorNode", "ConstantNode", "ParenthesisNode", "FunctionNode", "SymbolNode"].includes(node.type)) throw new Error("Unsupported expression.");
    if (node.type === "SymbolNode" && !["sqrt", "pow", "abs", "pi", "e"].includes(node.toString())) throw new Error("Unsupported symbol.");
    if (node.type === "OperatorNode" && !["+", "-", "*", "/", "^", "%"].includes((node as unknown as { op: string }).op)) throw new Error("Unsupported operator.");
  });
  const value = tree.compile().evaluate();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("The result must be a finite real number.");
  return String(value);
}
