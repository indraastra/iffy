import { GameState, StateValue } from '../../types/emergentStory.js';

export class ConditionEvaluator {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  // Update state reference
  updateState(state: GameState): void {
    this.state = state;
  }

  // Main evaluation method
  evaluate(condition: string): boolean {
    // Handle special constants
    if (condition.trim() === 'always') return true;
    if (condition.trim() === 'never') return false;

    try {
      return this.evaluateExpression(condition.trim());
    } catch (error) {
      throw new Error(`Failed to evaluate condition "${condition}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Parse and evaluate boolean expressions
  private evaluateExpression(expr: string): boolean {
    // Handle AND operations (&&)
    if (expr.includes('&&')) {
      const parts = expr.split('&&').map(part => part.trim());
      return parts.every(part => this.evaluateExpression(part));
    }

    // Handle OR operations (||)
    if (expr.includes('||')) {
      const parts = expr.split('||').map(part => part.trim());
      return parts.some(part => this.evaluateExpression(part));
    }

    // Handle negation (!)
    if (expr.startsWith('!')) {
      const innerExpr = expr.slice(1).trim();
      return !this.evaluateExpression(innerExpr);
    }

    // Handle parentheses - simple recursive parsing
    if (expr.startsWith('(') && expr.endsWith(')')) {
      return this.evaluateExpression(expr.slice(1, -1));
    }

    // Handle comparison operations
    return this.evaluateComparison(expr);
  }

  // Evaluate comparison operations (>=, <=, >, <, ==, !=)
  private evaluateComparison(expr: string): boolean {
    const operators = ['>=', '<=', '==', '!=', '>', '<'];
    
    for (const op of operators) {
      if (expr.includes(op)) {
        const [left, right] = expr.split(op).map(part => part.trim());
        const leftValue = this.getValue(left);
        const rightValue = this.parseValue(right);

        // Handle undefined values gracefully - they make conditions false except for != undefined
        if (leftValue === undefined || rightValue === undefined) {
          switch (op) {
            case '==':
              return leftValue === rightValue; // undefined == undefined is true
            case '!=':
              return leftValue !== rightValue; // undefined != something is true
            default:
              return false; // All other operations with undefined are false
          }
        }

        switch (op) {
          case '>=':
            return this.compareValues(leftValue, rightValue) >= 0;
          case '<=':
            return this.compareValues(leftValue, rightValue) <= 0;
          case '>':
            return this.compareValues(leftValue, rightValue) > 0;
          case '<':
            return this.compareValues(leftValue, rightValue) < 0;
          case '==':
            return leftValue === rightValue;
          case '!=':
            return leftValue !== rightValue;
        }
      }
    }

    // Handle boolean variable reference (no comparison operator)
    const value = this.getValue(expr);
    
    // Undefined values are falsy
    if (value === undefined) {
      return false;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle truthy/falsy evaluation for non-boolean values
    return Boolean(value);
  }

  // Get value from state or parse literal
  private getValue(key: string): StateValue {
    // Check if it's a quoted string
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      return key.slice(1, -1);
    }

    // Check if it's a number
    const numValue = parseFloat(key);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // Check if it's a boolean literal
    if (key === 'true') return true;
    if (key === 'false') return false;

    // Must be a state variable - if not found, treat as undefined (emergent state)
    if (!(key in this.state)) {
      return undefined;
    }

    return this.state[key];
  }

  // Parse string value to appropriate type
  private parseValue(value: string): StateValue {
    return this.getValue(value);
  }

  // Compare two values (supports numbers and strings)
  private compareValues(a: StateValue, b: StateValue): number {
    // Both numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Both strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    // Mixed types - convert to strings for comparison
    const aStr = String(a);
    const bStr = String(b);
    return aStr.localeCompare(bStr);
  }
}