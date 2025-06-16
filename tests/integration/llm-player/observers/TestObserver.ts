import { InteractionLog, TestScenario, GoalStatus } from '../core/types';
import * as readline from 'node:readline';

export interface TestObserver {
  onTurnStart(turn: number, maxTurns?: number): void;
  onGameState(state: InteractionLog['gameState']): void;
  onPlayerThinking(thinking: string): void;
  onActionChosen(action: string, responseTime: number): void;
  onEngineResponse(response: InteractionLog['engineResponse']): void;
  onGoalProgress(progress: InteractionLog['goalProgress']): void;
  waitForInput(): Promise<string>;
  onTestComplete(success: boolean, message?: string): void;
}

export class ConsoleTestObserver implements TestObserver {
  private rl?: readline.Interface;
  private colorized: boolean;
  private clearScreen: boolean;
  private scenario?: TestScenario;
  private debugMode: boolean = false;

  constructor(options: { colorized?: boolean; clearScreen?: boolean } = {}) {
    this.colorized = options.colorized ?? true;
    this.clearScreen = options.clearScreen ?? true;
  }

  setScenario(scenario: TestScenario): void {
    this.scenario = scenario;
    // Set initial debug mode based on scenario verbosity
    this.debugMode = scenario.observability?.verbosity === 'debug';
  }
  
  getDebugMode(): boolean {
    return this.debugMode;
  }

  private clear(): void {
    if (this.clearScreen) {
      console.clear();
    }
  }

  private color(text: string, colorCode: string): string {
    return this.colorized ? `\x1b[${colorCode}m${text}\x1b[0m` : text;
  }

  private separator(char = '═', length = 60): void {
    console.log(char.repeat(length));
  }

  onTurnStart(turn: number, maxTurns?: number): void {
    this.clear();
    this.separator();
    const turnInfo = maxTurns ? `Turn ${turn}/${maxTurns}` : `Turn ${turn}`;
    console.log(`${turnInfo} | ${this.scenario?.name || 'Test Running'}`);
    this.separator();
  }

  onGameState(state: InteractionLog['gameState']): void {
    console.log(`📍 Current Scene: ${this.color(state.currentScene, '36')}`);
    
    if (this.scenario?.goals) {
      this.scenario.goals.forEach(goal => {
        console.log(`🎯 Goal: ${goal.type} "${goal.target}" [${this.color('❌ Not achieved', '31')}]`);
      });
    }
    
    this.separator();
    console.log();
    console.log(this.color('>', '90') + ' ' + state.visibleText);
    console.log();

    if (state.availableActions.length > 0) {
      console.log(this.color('Available actions:', '33'));
      state.availableActions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });
      console.log();
    }
  }

  onPlayerThinking(thinking: string): void {
    if (this.scenario?.observability?.showThinking) {
      console.log(this.color('🤔 Player thinking:', '35'));
      console.log(this.color(`"${thinking}"`, '90'));
      console.log();
    }
  }

  onActionChosen(action: string, responseTime: number): void {
    console.log(`${this.color('✅ Action chosen:', '32')} ${action} ${this.color(`(${responseTime}ms)`, '90')}`);
    console.log();
  }

  onEngineResponse(response: InteractionLog['engineResponse']): void {
    console.log(this.color('📖 Story Response:', '36'));
    console.log();
    
    // Format the narrative with better visual separation
    const lines = response.narrative.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`   ${line}`);
      } else {
        console.log();
      }
    });
    console.log();

    if (response.errors && response.errors.length > 0) {
      console.log(this.color('❌ Errors:', '31'));
      response.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
      console.log();
    }
  }

  onGoalProgress(progress: InteractionLog['goalProgress']): void {
    const achieved = progress.goalsStatus.filter(g => g.achieved);
    if (achieved.length > 0) {
      console.log(this.color('🎉 Goals achieved this turn:', '32'));
      achieved.forEach(status => {
        console.log(`  - ${status.goal.type}: ${status.goal.target}`);
      });
      console.log();
    }
  }

  async waitForInput(): Promise<string> {
    if (!this.scenario?.observability?.interactive) {
      return 'continue';
    }

    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    const debugStatus = this.debugMode ? 'ON' : 'OFF';
    const prompt = this.color(`[Enter=continue, q=quit, d=debug(${debugStatus}), s=skip pauses]`, '90');
    
    return new Promise((resolve) => {
      this.rl!.question(prompt + ' ', (answer) => {
        const input = answer.toLowerCase() || 'continue';
        
        if (input === 'd') {
          this.debugMode = !this.debugMode;
          console.log(this.color(`🔧 Debug mode ${this.debugMode ? 'ENABLED' : 'DISABLED'}`, '33'));
          // Ask again after toggling
          this.waitForInput().then(resolve);
          return;
        }
        
        resolve(input);
      });
    });
  }

  onTestComplete(success: boolean, message?: string): void {
    this.separator();
    if (success) {
      console.log(this.color('✅ TEST PASSED', '32'));
    } else {
      console.log(this.color('❌ TEST FAILED', '31'));
    }
    if (message) {
      console.log(message);
    }
    this.separator();
    
    if (this.rl) {
      this.rl.close();
    }
  }
}

export class NullTestObserver implements TestObserver {
  onTurnStart(): void {}
  onGameState(): void {}
  onPlayerThinking(): void {}
  onActionChosen(): void {}
  onEngineResponse(): void {}
  onGoalProgress(): void {}
  async waitForInput(): Promise<string> { return 'continue'; }
  onTestComplete(): void {}
}