import { LogBox } from 'react-native';
import { Text } from 'react-native';
import React from 'react';

// Enable more detailed error reporting
LogBox.ignoreLogs(['Warning: Each child in a list should have a unique "key" prop']);

// Custom error boundary component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Error caught by ErrorBoundary:');
    console.log('Error:', error);
    console.log('Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Text style={{ padding: 20, color: 'red' }}>
          Error in {this.props.componentName || 'component'}: {this.state.error?.toString()}
          {'\n\n'}
          Component Stack: {this.state.errorInfo?.componentStack}
        </Text>
      );
    }

    return this.props.children;
  }
}

// Function to wrap components with error boundary
export function withErrorBoundary(Component, componentName) {
  return (props) => (
    <ErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// Enhanced console logging for React Native
export function enhanceConsoleLogging() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Check if this is a text outside <Text> error
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Text strings must be rendered within a <Text>')) {
      console.log('DETAILED TEXT ERROR INFO:');
      console.log('Error message:', args[0]);
      
      // Try to get the component stack
      const stackInfo = args.find(arg => typeof arg === 'string' && arg.includes('in '));
      if (stackInfo) {
        console.log('Component stack:', stackInfo);
      }
      
      // Log the full error object
      console.log('Full error args:', JSON.stringify(args));
    }
    
    originalConsoleError.apply(console, args);
  };
}
