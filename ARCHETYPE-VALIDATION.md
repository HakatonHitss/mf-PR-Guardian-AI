# Validación de arquetipos

El menú Arquetipos consulta repositorios reales con la conexión Bitbucket del usuario. Las referencias son:

| Tipo | Repositorio de ARK | Rama |
| --- | --- | --- |
| Shell | sh-template | Desarrollo |
| Microfrontend | mf-template | Desarrollo |
| Microservicio | arquetipoj21opcionales | Desarrollo |

Se resuelve primero la rama a un commit para cada repositorio. Todos los archivos y configuraciones se consultan usando esos hashes, evitando mezclar revisiones. El informe exportado identifica origen, referencia, commits, opciones y evidencia. En monorepos se puede indicar la raíz del módulo.

## Diagnóstico inicial

Sin política publicada se muestra una comparación de referencia: diferencias, rutas ausentes, declaraciones de dependencias corporativas/framework y scripts build/test/lint. Esto no certifica todos los lineamientos de arquitectura, seguridad o versiones.

En Angular se excluyen los nombres de features y servicios de ejemplo, fuentes, imágenes, mocks y skills. Se comprueba que existan carpetas equivalentes core/features/public cuando aparecen en la referencia, sin exigir nombres del negocio de la plantilla. La ausencia de una dependencia se señala como diferencia; las versiones solo se exigen cuando una política lo declara.

Para Java se utiliza `src/main/resources/archetype-resources`, no el proyecto que construye el generador. Se leen los fileSets del descriptor Maven para permitir rutas de paquete y nombres sustituidos por classPrefix. Las reglas de DB, Kafka, JWT y REST client dependen de la elección de cada proyecto. Sin especificar se muestran sin evaluar; una opción desactivada queda no aplicable. La comparación no ejecuta el generador, Groovy, Maven, código Java ni configuraciones JavaScript.

La identificación de shell/microfrontend usa Angular y evidencia de federation.config.js/manifest; Java usa pom.xml y fuentes. Si resulta ambigua, se pide elegir el tipo. Una identificación distinta de la esperada se señala con evidencia.

## Política formal

Para que el resultado pueda decir Cumple/Incumple reglas publicadas, el equipo responsable debe definir y publicar `.guardian/archetype-rules.json` en la raíz de cada repositorio ARK y rama Desarrollo. La aplicación no publica esta política automáticamente ni convierte la plantilla entera en una obligación.

Ejemplo de sintaxis (revisar los requisitos antes de publicarlo):

```json
{
  "version": "1.0",
  "rules": [
    {"id":"docker","title":"Contenedor del proyecto","category":"Despliegue","kind":"file","pattern":"Dockerfile"},
    {"id":"routes","title":"Rutas de Angular","category":"Estructura","kind":"file","pattern":"src/app/app.routes.ts"},
    {"id":"test-command","title":"Comando de pruebas","category":"Calidad","kind":"script","pattern":"test"}
  ]
}
```

Tipos soportados:

- file: patrón relativo con `*`, `?` y `**`; por ejemplo `src/main/java/**/controller/*Controller.java`.
- directory: carpeta relativa literal, satisfecha cuando hay al menos un archivo dentro.
- dependency: nombre de dependencia de package.json, en dependencies o devDependencies.
- script: nombre de un script no vacío de package.json.
- expected (opcional, solo dependency/script): declaración textual exacta; no interpreta rangos semver ni ejecuta comandos.
- feature (opcional): nombre de opción, por ejemplo includeKafka. Requiere indicar true/false; sin valor queda sin evaluar.

No se soportan condiciones adicionales implícitas: campos desconocidos o reglas inválidas producen un error, sin dar un aprobado. Si no se evaluó ninguna regla o quedan reglas sin evaluar, no se emite un cumplimiento completo. La validación cubre únicamente las reglas declaradas, no calidad semántica de todo el código.

## Resultados y gráfico

Se muestran presentes/cumplidas, faltantes/diferentes, sin evaluar y no aplicables, con búsqueda por ruta, regla, categoría o evidencia. La evaluación no escribe archivos ni envía código a Huawei.

El gráfico agrega faltantes reales por categoría de hasta 50 evaluaciones en memoria de la sesión. La misma instantánea, arquetipo, módulo y opciones no se duplica. No es un histórico persistente ni representa análisis automáticos de todos los repositorios. Al desconectar Bitbucket se limpia esta información.