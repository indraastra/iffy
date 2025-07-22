/**
 * Diagnostic utilities for debug pane issues
 * Run these in browser console to diagnose debug pane problems
 */

export class DebugPaneDiagnostics {
  static testDebugPane(debugPane: any) {
    console.log('=== Debug Pane Diagnostics ===');
    
    // Basic existence checks
    console.log('1. Debug pane exists:', !!debugPane);
    console.log('2. Debug pane type:', typeof debugPane);
    console.log('3. Debug pane toString:', debugPane?.toString());
    
    // Method checks
    console.log('4. Has log property:', 'log' in debugPane);
    console.log('5. Log property type:', typeof debugPane?.log);
    console.log('6. Log property exists (truthy):', !!debugPane?.log);
    
    // Proxy detection
    console.log('7. Is Proxy-like:', this.isProxyLike(debugPane));
    
    // Property enumeration
    console.log('8. Object keys:', Object.keys(debugPane || {}));
    console.log('9. Property descriptors:');
    try {
      const descriptors = Object.getOwnPropertyDescriptors(debugPane || {});
      console.log('   Descriptors:', descriptors);
    } catch (e) {
      console.log('   Could not get descriptors:', e);
    }
    
    // Function call test
    console.log('10. Testing log function call:');
    try {
      if (debugPane?.log) {
        debugPane.log('🔧 Debug pane diagnostic test message');
        console.log('   ✅ Log call succeeded');
      } else {
        console.log('   ❌ No log function available');
      }
    } catch (error) {
      console.log('   ❌ Log call failed:', error);
    }
    
    console.log('=== End Diagnostics ===');
  }
  
  static isProxyLike(obj: any): boolean {
    if (!obj) return false;
    
    // Try to detect Proxy by checking for Vue reactivity or other common patterns
    try {
      const str = obj.toString();
      if (str.includes('Proxy') || str.includes('ReactiveObject')) {
        return true;
      }
      
      // Check if property access seems to go through traps
      const beforeAccess = performance.now();
      obj.someNonExistentProperty; // Access non-existent property to test Proxy behavior
      const afterAccess = performance.now();
      
      // If accessing a non-existent property takes longer, might be a Proxy
      return (afterAccess - beforeAccess) > 0.1;
    } catch (e) {
      return false;
    }
  }
  
  static testLangChainDirector(engine: any) {
    console.log('=== LangChain Director Diagnostics ===');
    
    const director = engine?.director;
    console.log('1. Director exists:', !!director);
    console.log('2. Director debug pane:', director?.debugPane);
    
    if (director?.debugPane) {
      this.testDebugPane(director.debugPane);
    }
    
    const actionClassifier = director?.actionClassifier;
    console.log('3. Action classifier exists:', !!actionClassifier);
    console.log('4. Action classifier debug pane:', actionClassifier?.debugPane);
    
    if (actionClassifier?.debugPane) {
      console.log('5. Action classifier debug pane matches director:', 
        actionClassifier.debugPane === director.debugPane);
    }
    
    console.log('=== End Director Diagnostics ===');
  }
  
  static async testFullPipeline(engine: any, debugPane: any) {
    console.log('=== Full Pipeline Test ===');
    
    // Set debug pane
    console.log('1. Setting debug pane on engine...');
    engine?.setDebugPane?.(debugPane);
    
    // Test immediate logging
    console.log('2. Testing direct debug pane logging...');
    try {
      debugPane?.log?.('🔧 Direct test message from diagnostics');
    } catch (e) {
      console.log('   Direct logging failed:', e);
    }
    
    // Test a simple action
    console.log('3. Testing action processing...');
    const testContext = {
      currentSketch: 'Diagnostic test scene',
      activeMemory: [],
      currentTransitions: {},
      storyComplete: false
    };
    
    try {
      await engine?.processAction?.(testContext, 'diagnostic test action');
      console.log('   Action processing completed');
    } catch (e) {
      console.log('   Action processing failed:', e);
    }
    
    console.log('=== End Pipeline Test ===');
  }
}

// Make it available globally for browser console use
if (typeof window !== 'undefined') {
  (window as any).DebugPaneDiagnostics = DebugPaneDiagnostics;
}