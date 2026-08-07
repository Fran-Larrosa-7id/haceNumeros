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
npm run data:validate
```

La cobertura disponible puede consultarse informativamente —su antigüedad no bloquea CI— con:

```bash
npm run data:rent:status
```

Para ejecutar la validación completa de producción:

```bash
npm run data:validate
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

## Search Console

- Propiedad recomendada: dominio `hacenumeros.com`.
- Verificación: registro DNS TXT, sin guardar el token en el repositorio.
- Sitemap para enviar: `https://hacenumeros.com/sitemap.xml`.

La inspección de URLs y la solicitud de indexación se realizan manualmente desde Search Console; el
build y GitHub Actions no llaman a Google.

### Revisión SEO mensual

En Search Console, abrir **Rendimiento → Consultas**, filtrar por página y revisar impresiones,
clics, CTR y posición media. Usar por separado:

- `https://hacenumeros.com/calculadora-aumento-alquiler`
- `https://hacenumeros.com/calculadora-sueldo-bruto-neto`

Las frases definidas en el contenido son intenciones objetivo, no consultas que ya estén
posicionando. Hasta que Search Console tenga datos suficientes, no se deben inventar resultados ni
conclusiones.

## Checklist al publicar una nueva calculadora

1. Crear la ruta pública en `src/app/app.routes.ts`.
2. Confirmar que Angular la prerenderiza.
3. Definir title, description y robots mediante `SeoService`.
4. Definir su canonical HTTPS en `hacenumeros.com`.
5. Agregar structured data sólo si representa contenido real y visible.
6. Agregar la URL canónica a `public/sitemap.xml`.
7. Agregar un enlace interno desde una página existente y eliminar su estado “Próximamente”.
8. Agregar o actualizar tests SEO sin enlazar rutas futuras.
9. Ejecutar `npm test`, `npm run build` y `npm run validate:dist`.
10. Publicar mediante un push a `main` y comprobar el deploy de Pages.
11. Inspeccionar la URL y solicitar indexación manualmente en Search Console.

Con sólo tres páginas indexables, el sitemap continúa deliberadamente estático. Al agregar una nueva
calculadora deben actualizarse conjuntamente ruta, metadata, enlace interno, sitemap y validador de
distribución.
