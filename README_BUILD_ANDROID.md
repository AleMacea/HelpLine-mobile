Build Android (APK/AAB) com EAS

Pré‑requisitos
- Conta Expo (gratuita): https://expo.dev
- EAS CLI instalado: npm i -g eas-cli
- API acessível no endereço configurado em EXPO_PUBLIC_API_BASE

Perfis de build
- Arquivo: eas.json (já incluso)
  - preview: APK (compartilhar via link/instalar direto)
  - production: AAB (Play Store)
  - development: dev client (debug local)

Variáveis de ambiente
- Usamos EXPO_PUBLIC_API_BASE. No perfil preview já está definido para:
  http://192.168.1.6:5174
- ATENÇÃO: esse IP só funciona na mesma rede do servidor de API. Para demo fora da sua LAN, use um endpoint público (HTTPS) e atualize o eas.json.

Config do app
- app.json -> android.package: com.coremind.helpline (ajuste se precisar)
- app.json -> android.versionCode: 1 (incrementar a cada release)

Comandos
1) Login no Expo:
   eas login

2) (Opcional) Verificação rápida:
   npx expo-doctor

3) Build APK (preview):
   eas build -p android --profile preview

   - Ao finalizar, a CLI mostra um link para baixar o .apk

4) Build AAB (Play Store):
   eas build -p android --profile production

   - Submeter para Play Store:
     eas submit -p android --path caminho/para/seu.aab

5) Dev Client (debug em dispositivo):
   eas build -p android --profile development
   npx expo start --dev-client

Notas importantes
- HTTP (sem HTTPS) em Android: apps recentes podem bloquear tráfego claro. Prefira HTTPS. Se precisar usar HTTP, mantenha os testes na mesma rede e considere um endpoint público/HTTPS para apresentação.
- CORS: a API deve permitir a origem do app (no Dev, já configuramos localhost/Expo web). Para builds, use HTTPS público para evitar redirecionamentos/erros de preflight.

