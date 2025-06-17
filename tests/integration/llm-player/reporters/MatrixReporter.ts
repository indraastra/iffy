import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { MatrixTestResult } from '../core/matrix-types';

export class MatrixReporter {
  async generateReport(
    result: MatrixTestResult, 
    outputPath: string,
    format: 'markdown' | 'html' | 'json' = 'markdown'
  ): Promise<void> {
    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    switch (format) {
      case 'markdown':
        await this.generateMarkdownReport(result, outputPath);
        break;
      case 'html':
        await this.generateHtmlReport(result, outputPath);
        break;
      case 'json':
        await this.generateJsonReport(result, outputPath);
        break;
    }
  }

  private async generateMarkdownReport(result: MatrixTestResult, outputPath: string): Promise<void> {
    const report = this.buildMarkdownReport(result);
    await writeFile(outputPath, report, 'utf-8');
  }

  private async generateHtmlReport(result: MatrixTestResult, outputPath: string): Promise<void> {
    const report = this.buildHtmlReport(result);
    await writeFile(outputPath, report, 'utf-8');
  }

  private async generateJsonReport(result: MatrixTestResult, outputPath: string): Promise<void> {
    await writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  }

  private buildMarkdownReport(result: MatrixTestResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Test Matrix Results');
    lines.push(`Generated: ${result.summary.timestamp}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push(`- **Total Tests**: ${result.summary.totalTests}`);
    lines.push(`- **Passed**: ${result.summary.passed} (${this.percentage(result.summary.passed, result.summary.totalTests)}%)`);
    lines.push(`- **Failed**: ${result.summary.failed} (${this.percentage(result.summary.failed, result.summary.totalTests)}%)`);
    lines.push(`- **Duration**: ${this.formatDuration(result.summary.duration)}`);
    lines.push(`- **Total Cost**: $${result.summary.totalCost.total.toFixed(4)}`);
    
    if (Object.keys(result.summary.totalCost.byProvider).length > 0) {
      lines.push('  - By Provider:');
      for (const [provider, cost] of Object.entries(result.summary.totalCost.byProvider)) {
        lines.push(`    - ${provider}: $${cost.toFixed(4)}`);
      }
    }
    lines.push('');

    // Results by Engine Profile
    lines.push('## Results by Engine Profile');
    lines.push('');
    lines.push('| Profile | Tests | Passed | Failed | Success Rate | Avg Turns | Avg Duration | Avg Cost |');
    lines.push('|---------|-------|--------|--------|--------------|-----------|--------------|----------|');
    
    for (const [profile, stats] of Object.entries(result.byEngineProfile)) {
      lines.push(
        `| ${profile} | ${stats.tests} | ${stats.passed} | ${stats.failed} | ` +
        `${stats.successRate.toFixed(1)}% | ${stats.avgTurns.toFixed(1)} | ` +
        `${this.formatDuration(stats.avgDuration)} | $${stats.avgCost.total.toFixed(4)} |`
      );
    }
    lines.push('');

    // Results by Player Profile
    lines.push('## Results by Player Profile');
    lines.push('');
    lines.push('| Profile | Tests | Passed | Failed | Success Rate | Avg Turns | Avg Cost |');
    lines.push('|---------|-------|--------|--------|--------------|-----------|----------|');
    
    for (const [profile, stats] of Object.entries(result.byPlayerProfile)) {
      lines.push(
        `| ${profile} | ${stats.tests} | ${stats.passed} | ${stats.failed} | ` +
        `${stats.successRate.toFixed(1)}% | ${stats.avgTurns.toFixed(1)} | ` +
        `$${stats.avgCost.toFixed(4)} |`
      );
    }
    lines.push('');

    // Results by Scenario
    lines.push('## Results by Scenario');
    lines.push('');
    
    for (const [scenario, data] of Object.entries(result.byScenario)) {
      lines.push(`### ${scenario}`);
      lines.push('');
      lines.push('| Engine | Player | Status | Turns | Duration | Ending | Cost | Notes |');
      lines.push('|--------|--------|--------|-------|----------|--------|------|-------|');
      
      for (const r of data.results) {
        const status = r.success ? '✅' : '❌';
        const ending = r.endingReached || '-';
        const notes = r.errorMessage ? r.errorMessage.substring(0, 50) + '...' : '';
        
        lines.push(
          `| ${r.engineProfile} | ${r.playerProfile} | ${status} | ${r.turns} | ` +
          `${this.formatDuration(r.duration)} | ${ending} | $${r.cost.total.toFixed(4)} | ${notes} |`
        );
      }
      lines.push('');
    }

    // Classification Model Performance
    if (Object.keys(result.modelPerformance.classificationAccuracy).length > 0) {
      lines.push('## Classification Model Performance');
      lines.push('');
      lines.push('| Model | Correct | Total | Accuracy |');
      lines.push('|-------|---------|-------|----------|');
      
      for (const [model, stats] of Object.entries(result.modelPerformance.classificationAccuracy)) {
        lines.push(
          `| ${model} | ${stats.correct} | ${stats.total} | ${stats.accuracy.toFixed(1)}% |`
        );
      }
      lines.push('');
    }

    // Failures
    if (result.failures.length > 0) {
      lines.push('## Failures');
      lines.push('');
      lines.push('| Scenario | Engine | Player | Error | Log |');
      lines.push('|----------|--------|--------|-------|-----|');
      
      for (const failure of result.failures) {
        const logLink = failure.logPath ? `[View](${failure.logPath})` : '-';
        const errorMsg = failure.error.substring(0, 50) + (failure.error.length > 50 ? '...' : '');
        
        lines.push(
          `| ${failure.scenario} | ${failure.engineProfile} | ${failure.playerProfile} | ` +
          `${errorMsg} | ${logLink} |`
        );
      }
      lines.push('');
    }

    // Recommendations
    lines.push('## Analysis & Recommendations');
    lines.push('');
    
    // Find best performing configurations
    const engineProfiles = Object.entries(result.byEngineProfile)
      .sort((a, b) => b[1].successRate - a[1].successRate);
    
    if (engineProfiles.length > 0) {
      const [bestEngine, bestEngineStats] = engineProfiles[0];
      lines.push(`- **Most Reliable Engine**: ${bestEngine} (${bestEngineStats.successRate.toFixed(1)}% success rate)`);
    }
    
    // Find most cost-effective
    const costEffective = Object.entries(result.byEngineProfile)
      .filter(([_, stats]) => stats.successRate >= 75) // At least 75% success
      .sort((a, b) => a[1].avgCost.total - b[1].avgCost.total);
    
    if (costEffective.length > 0) {
      const [cheapest, cheapestStats] = costEffective[0];
      lines.push(`- **Most Cost-Effective**: ${cheapest} ($${cheapestStats.avgCost.total.toFixed(4)}/test with ${cheapestStats.successRate.toFixed(1)}% success)`);
    }

    return lines.join('\n');
  }

  private buildHtmlReport(result: MatrixTestResult): string {
    const markdown = this.buildMarkdownReport(result);
    
    // Simple HTML wrapper with styled tables
    return `<!DOCTYPE html>
<html>
<head>
    <title>Test Matrix Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .success { color: #27ae60; }
        .failure { color: #e74c3c; }
        code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
${this.markdownToHtml(markdown)}
</body>
</html>`;
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/✅/g, '<span class="success">✅</span>')
      .replace(/❌/g, '<span class="failure">❌</span>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^<li>/gm, '<ul><li>')
      .replace(/<\/li>\n(?!<li>)/g, '</li></ul>')
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        const isHeader = cells.some(c => c.includes('---'));
        
        if (isHeader) return '';
        
        const tag = match.includes('Profile') || match.includes('Model') || match.includes('Engine') ? 'th' : 'td';
        const row = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
        return `<tr>${row}</tr>`;
      })
      .replace(/<tr>/g, '<table><tr>')
      .replace(/<\/tr>(?!<tr>)/g, '</tr></table>')
      .replace(/<p>/g, '<p>')
      .replace(/^(.+)$/gm, (line) => {
        if (line.includes('<') || line.trim() === '') return line;
        return `<p>${line}</p>`;
      });
  }

  private percentage(value: number, total: number): string {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}