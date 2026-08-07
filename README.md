# Hacé Números

Calculadoras gratuitas para Argentina construidas con Angular. El sitio estático de producción se
publica en `https://hacenumeros.com/` mediante GitHub Pages.

## Desarrollo local

Se utiliza Node.js 22.22.3 LTS en CI. Para instalar exactamente las dependencias del lockfile e
iniciar el servidor local:

```bash
npm ci
npm start
```

## Validación

Los datasets oficiales ya generados se validan sin descargarlos ni modificarlos:

```bash
npm run data:rent:validate
```

La cobertura disponible puede consultarse informativamente —su antigüedad no bloquea CI— con:

```bash
npm run data:rent:status
```

Para ejecutar la validación completa de producción:

```bash
npm run data:rent:validate
npm test
npm run build
npm run validate:dist
```

`validate:dist` comprueba el prerender, la metadata SEO, los archivos públicos y los datasets del
artefacto, y verifica que no se publiquen fuentes XLS, XLSX, CSV o PDF.

## Actualización manual de datos

Las fuentes versionadas están en `data-sources/rent-indexes`. Para regenerar los JSON después de
incorporar manualmente una fuente oficial validada:

```bash
npm run data:rent:build
npm run data:rent:validate
npm test
npm run build
npm run validate:dist
```

No existe descarga automática, scraping, cron ni modificación de datasets desde CI. Queda
pendiente para una tarea futura el monitoreo automático de nuevas publicaciones oficiales.

## CI/CD y publicación

- Los pull requests ejecutan instalación reproducible, validación de datasets, tests, build,
  prerender y validación del artefacto. Nunca despliegan.
- Cada push a `main` repite esas validaciones y, únicamente si todas pasan, publica
  `dist/haceNumeros/browser` con el flujo oficial de GitHub Pages.
- El deploy también puede relanzarse manualmente desde GitHub Actions.
- `public/CNAME` conserva el dominio personalizado y el build mantiene `<base href="/">`.

No hay un comando manual de deploy ni una rama `gh-pages` administrada desde npm: el único camino
de publicación es `commit → push a main → GitHub Actions → GitHub Pages`.
