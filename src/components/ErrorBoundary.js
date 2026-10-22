import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

// Bir ekran render sırasında hata fırlatırsa tüm uygulamanın kararmasını önler;
// hatayı okunur şekilde gösterir.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // geliştirme için konsola da yaz
    console.log('ErrorBoundary yakaladı:', error?.message, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.title}>⚠️ Bir hata oluştu</Text>
          <Text style={styles.msg}>{String(this.state.error?.message || this.state.error)}</Text>
          <Text style={styles.stack}>{String(this.state.error?.stack || '').slice(0, 1200)}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 20, fontWeight: '900', color: '#DC2626', marginBottom: 12 },
  msg: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  stack: { fontSize: 11, color: '#64748B', fontFamily: 'monospace' },
});
