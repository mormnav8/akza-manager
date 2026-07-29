# akza-manager

Interfaz web para gestionar un duelo de cartas entre dos personajes.

## Uso

1. Abrir `index.html` en el navegador.
2. Crear los dos personajes indicando nombre, vida máxima, stamina máxima y destreza.
3. Guardar ambos personajes.
4. Pulsar `Comenzar duelo`.
5. Lanzar los dados y confirmar qué jugador comienza.
6. En el turno activo, usar los botones Vida, Stamina, Bloqueo o Daño.
7. El duelo termina cuando un jugador llega a 0 puntos de vida o menos.

## Archivos

- `index.html` - estructura y páginas de la aplicación.
- `styles.css` - estilos para la página principal y el panel de batalla.
- `script.js` - lógica de guardado de personajes, lanzamiento de dados y turnos.

## Despliegue en GitHub Pages

Para desplegar en GitHub Pages desde la rama `main`:

1. En el repositorio de GitHub, ve a `Settings > Pages`.
2. En `Build and deployment`, selecciona `GitHub Actions`.
3. Guarda la configuración.
4. Haz push a `main` para que el workflow de `.github/workflows/gh-pages.yml` publique la página.

El sitio se publicará en `https://mormnav8.github.io/akza-manager/` (o la URL que GitHub Pages asigne a tu repositorio).

## Despliegue en Vercel (opcional)

Si quieres seguir usando Vercel, la configuración ya está en `vercel.json`.

```bash
npm install -g vercel
cd /workspaces/akza-manager
vercel login
vercel --prod
```
