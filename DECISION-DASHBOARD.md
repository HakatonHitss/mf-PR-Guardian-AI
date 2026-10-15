# Centro de decisiones de PR

La aplicación funciona exclusivamente con un conjunto local de 36 PR en `src/app/features/decisions/decision-mocks.ts`. No necesita base de datos, tokens, VPN ni servidores Bitbucket, SonarQube, Jenkins o Huawei. Los nombres y resultados son datos sintéticos para la presentación; no representan evaluaciones de personas ni actividad real. La interfaz utiliza nombres y textos operativos, sin selector de modos.

## Pantallas
- Dashboard: cinco indicadores, severidad, evolución de cobertura, recomendación, controles conformes/fallidos, errores por proyecto y equipo.
- Pull Requests: reporte de ocho controles con cobertura, pipeline, pruebas, commit y diferencias de arquetipo; exportaciones HTML/JSON.
- Hallazgos, cobertura, arquetipos, proyectos e historial: vistas del mismo conjunto de registros.
- Reportes: indicadores descargables en CSV.
- Asistente de revisión: resumen local por reglas de la evidencia del PR; no llama a un modelo de IA.
- Configuración: cobertura mínima de 70%, 80% o 90% durante la sesión.

## Coherencia
Una recomendación bloqueada tiene controles fallidos. Evidencia ausente o de un commit anterior impide recomendar aprobación. Las advertencias requieren revisión. Cero cobertura es distinto de cobertura ausente. Los promedios excluyen análisis antiguos. La decisión histórica se conserva al cambiar la política; es independiente de la recomendación calculada hoy. Los gráficos y tablas utilizan los mismos filtros y reglas. La severidad seleccionada filtra la tabla de hallazgos del dashboard.

Los módulos de integración anteriores permanecen en el repositorio, pero no se montan desde las rutas del centro de decisiones. Ninguna acción aprueba o rechaza PR en servidores externos.

## Distribución inicial
Con el umbral de cobertura del 80%: 18 PR conformes (50%), 9 bloqueados (25%), 6 con advertencias (16,7%) y 3 pendientes (8,3%). Cada mes conserva esa proporción. Los bloqueos incluyen seguridad crítica, pipeline, cobertura y estructura de pruebas; las advertencias incluyen documentación y hotspots por revisar. Los indicadores se calculan desde los registros, sin modificar sus reglas de evaluación para forzar resultados.
