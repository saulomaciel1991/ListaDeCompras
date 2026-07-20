import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.ionic.listadecompras',
  appName: 'Lista de Compras',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
