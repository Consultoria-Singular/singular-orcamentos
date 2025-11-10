# Top Toolbar Component

Standalone toolbar for authenticated pages. Provides primary navigation and session controls.

## Usage

1. Ensure `AuthFacade` is provided (already available via `AuthFacade`/`AuthStore`).
2. Import the component where needed:

```ts
import { TopToolbarComponent } from '../components/top-toolbar/top-toolbar.component';
```

3. Place it at the top of protected layouts:

```html
<app-top-toolbar></app-top-toolbar>
<router-outlet></router-outlet>
```

The component displays the current user email, links to `/projects` and `/users`, and triggers the logout flow (POST `/auth/logout`, clears auth store, navigates to `/login`).
