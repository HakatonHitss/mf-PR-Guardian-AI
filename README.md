# mf-PR-Guardian-AI

Nueve secciones Angular standalone con carga diferida: dashboard, pull-requests, hallazgos, cobertura, asistente, historial, proyectos, reportes y configuracion.

## Desarrollo

Ejecuta `npm start` en este directorio (puerto 4211) y en `../sh-template` (puerto 4201). Se conserva la autenticación de la shell. `npm run build` compila y genera el manifiesto de estilos; `npm run lint` requiere migrar la configuración heredada `.eslintrc.json` al formato flat de ESLint 10. `npx vitest run` ejecuta las pruebas de interacciones.

## Integración

El proyecto Angular y el remoto de Native Federation se llaman `mf-PR-Guardian-AI`. La compilación se genera en `dist/mf-PR-Guardian-AI/browser`. Se conservan las exposiciones `./Routes` y `./Component`. La shell usa el remoto `template`: `/default` muestra Dashboard y `/template` muestra Pull Requests; las otras siete rutas coinciden con los nombres de las secciones del remoto.

El manifiesto local apunta a `http://localhost:4211/remoteEntry.json`. Configura la URL de despliegue con el script existente `write-federation-manifest.mjs` de la shell.

## Alcance

Diseños responsive con datos de demostración, filtros, detalles, comparación de auditorías, exportación CSV y preferencias guardadas en localStorage. El asistente usa respuestas locales; las integraciones y la ejecución de políticas necesitan backend. Ambos periodos del reporte usan la misma fotografía de métricas de demostración.
