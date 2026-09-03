# StyleStore — Frontend Web (Angular)

Aplicación Web SPA moderna desarrollada en **Angular 21** para el sistema de autenticación centralizada y gestión de StyleStore.

---

## 🎨 Características

- **Arquitectura Standalone:** Componentes independientes sin `NgModules` innecesarios.
- **Gestión de Estado Reactiva:** Uso de Angular Signals en `AuthService`.
- **Seguridad:** `AuthInterceptor` (inyección automática de JWT Bearer token) y guardianes de ruta (`AuthGuard` & `GuestGuard`).
- **Diseño Cyber/Glassmorphism:** Interfaz estilizada con efectos de desenfoque de fondo, degradados HSL, alertas reactivas y fuentes Google (Plus Jakarta Sans y Space Grotesk).
- **Vistas Incluidas:**
  - **Login:** Formulario reactivo con control de visibilidad de contraseña.
  - **Registro:** Validación completa de campos en tiempo real.
  - **Dashboard:** Visualización del perfil del usuario, credenciales activas y cierre de sesión.

---

## 📦 Requisitos Previos

- Node.js 20+ / 22+ / 24+
- npm 10+ / 11+
- Angular CLI 19+ / 21+ (`npm install -g @angular/cli`)

---

## ⚙️ Instalación y Ejecución

1. **Instalar dependencias:**
   ```powershell
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```powershell
   npm start
   ```
   Navega a [http://localhost:4200/](http://localhost:4200/). La aplicación se recargará automáticamente si cambias los archivos fuente.

3. **Compilar para producción:**
   ```powershell
   npm run build
   ```
   Los artefactos de compilación se almacenarán en el directorio `dist/`.
