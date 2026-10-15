# Estado de módulos e integración con Bitbucket

La integración vive en `mf-PR-Guardian-AI/src/app/features/bitbucket`. El shell carga las rutas mediante Native Federation. El servicio de conexión es singleton del microfrontend; el token solo queda en memoria y se borra al desconectar o recargar.

| Módulo | Fuente y alcance | Datos en duro |
| --- | --- | --- |
| Conexión | Verificación contra proyectos y consulta de PR del token | No |
| Dashboard | Conteos consultados de Bitbucket y panel de métricas SonarQube | No; los conteos no representan totales sin completar la paginación |
| Proyectos y repositorios | `/rest/api/1.0/projects` y repositorios por proyecto | No |
| Pull Requests | `/rest/api/1.0/dashboard/pull-requests?state=OPEN&role=AUTHOR` | No; solo PR abiertos cuyo autor es el usuario del token |
| Hallazgos | SonarQube: conteos de vulnerabilidades, hotspots, bugs y code smells de la rama | No; requiere un análisis publicado en SonarQube |
| Cobertura | SonarQube: medida coverage del proyecto y rama | No; conserva el valor publicado y distingue métricas ausentes |
| Historial | Commits del PR seleccionado | No; no simula auditorías ni comparaciones de puntuaciones |
| Reportes | Métricas SonarQube y reportes Code Insights, con exportación JSON | No |
| Configuración | Conexiones Bitbucket y SonarQube y sus servidores | No políticas simuladas; no modifica configuración de los servidores |
| Asistente IA | Inferencia Huawei MaaS; modelo inicial glm-5.2 verificado | No respuestas fijas; contexto y código compartidos explícitamente |

Los errores HTTP, falta de permisos o ausencia de reportes se muestran expresamente, sin sustituirlos por datos de ejemplo. Los valores de respuesta simulados aparecen únicamente en pruebas automatizadas. Los textos de interfaz y etiquetas son estáticos, no resultados del servidor.

Code Insights debe estar disponible en la versión de Bitbucket y recibir reportes de las herramientas de análisis y pruebas. No publicar reportes o anotaciones no significa que el código haya pasado un análisis.

La conexión desde el navegador depende de acceso a la red interna, CORS y un esquema HTTP/HTTPS compatible. La compilación y las pruebas no validan acceso real al servidor privado.
## Desarrollo local y CORS

Se confirmó que el servidor responde HTTP 401 al preflight OPTIONS sin encabezados CORS. Por eso, en localhost las consultas a `http://172.19.113.113` usan `/bitbucket-api/rest/...`, que el servidor de desarrollo de Angular reenvía al servidor real. Tanto shell como microfrontend incluyen `proxy.conf.json`, sin tokens. Reinicia ambos `npm start` después de cambiar esta configuración.

En producción el proxy de Angular CLI no existe: se requiere habilitar CORS en Bitbucket o configurar una ruta equivalente en el servidor que publica el frontend. Otros servidores de Bitbucket conservan el acceso directo y requieren su propia configuración de CORS.
## SonarQube: cobertura, vulnerabilidades y métricas

Se agregó `src/app/features/sonarqube` con una conexión independiente a `http://172.19.245.21:9000/sonarqube`. El token se ingresa en la interfaz y solo se conserva en memoria. No se incorpora al repositorio ni al almacenamiento del navegador.

- Hallazgos: conteos reales de `vulnerabilities`, `security_hotspots`, `bugs` y `code_smells` del proyecto/rama consultados. No es una lista de incidencias por archivo.
- Cobertura: valor real de `coverage` para el proyecto/rama consultados.
- Dashboard, reportes y configuración: panel de conexión y medidas SonarQube, con Quality Gate, duplicación y líneas de código. Reportes conserva también Code Insights de Bitbucket.
- Los módulos anteriores de hallazgos y cobertura por Code Insights fueron reemplazados en las rutas visibles por el panel SonarQube.
- La clave inicial `biometric-local` y rama `Feature-300871` son parámetros editables tomados del ejemplo del usuario; no son resultados mock. No se asume equivalencia automática entre clave SonarQube y repositorio Bitbucket.
- La API consultada es `/api/measures/component` con `component`, `branch` opcional y `metricKeys`. Se distingue cero real de métrica ausente. La API devuelve medidas de la rama, no necesariamente del commit exacto del PR.
- Un error al consultar otra rama borra las métricas anteriores para no atribuirlas al nuevo contexto.
- `/sonarqube-api/**` se reenvía desde el servidor de desarrollo al contexto `/sonarqube` del servidor real. Reinicia ambos servidores Angular al agregar o modificar el proxy.

La conexión efectiva al servidor privado de SonarQube debe validarse en el entorno del usuario. IA ahora usa Huawei MaaS, según la sección de integración añadida abajo.
## Gráficos, búsquedas y pantallas

- Configuración es el único lugar con formularios de servidor y tokens. Las demás pantallas enlazan allí si no hay conexión. El enlace antiguo `/bitbucket` redirige a `/configuracion` y se retiró su opción duplicada del menú.
- Dashboard: resumen actual y distribución por tipo con barras; no muestra la tabla detallada de reportes.
- Hallazgos: conteos y barras de vulnerabilidades, hotspots, bugs y code smells. Permite consultar su evolución por métrica.
- Cobertura: medida actual y serie temporal real de cobertura.
- Las líneas consultan `/api/measures/search_history`, con proyecto y rama del último resultado válido, métrica, fecha inicial y paginación. Periodos disponibles: 30, 90 y 365 días. Solo se grafican valores publicados: faltantes no se rellenan con cero. Un solo análisis se muestra como un punto. Fechas de la gráfica y la tabla en UTC; las distancias horizontales representan tiempo real entre análisis.
- Errores o ausencia de historial no alteran las medidas actuales y no generan series de demostración. Cambiar proyecto/rama limpia la serie previa; una serie de otra métrica o periodo no se muestra como si fuera la selección actual.
- Proyectos, repositorios y PR: búsquedas locales sobre registros cargados. Se mantiene el control Cargar más; se identifica que el filtro no recorre páginas no consultadas. La búsqueda ignora mayúsculas y acentos.
- Reportes: tabla con búsqueda por nombre o clave de métrica y exportación JSON. La exportación incluye el historial consultado con su contexto, si existe; Code Insights se conserva en una sección separada.
- Los gráficos se implementan en CSS/SVG sin librerías adicionales y tienen alternativas de texto y tabla de valores exactos.
## Asistente Huawei MaaS

La demostración se reemplazó por `src/app/features/huawei-ai`: un asistente de análisis de frontend Angular y calidad mediante la API compatible `/openai/v1/chat/completions`. No es un agente administrado de AgentArts ni un ejecutor autónomo: no cambia archivos ni inspecciona todo el repositorio.

- Conexión y selección de modelo en Configuración; clave ingresada en un campo de contraseña, solo en memoria. No se guardan claves en archivos ni en localStorage.
- Se comprobó el catálogo con la clave proporcionada: deepseek-v4-flash, deepseek-v4.1-flash, glm-5.1, glm-5.2 y glm-5.3. Un catálogo no garantiza permiso de inferencia para cada modelo.
- Inferencia real de prueba: `glm-5.2` respondió `OK.`. `deepseek-v4-flash` y `glm-5.1` devolvieron ModelArts.81015 (modelo rechazado por la lista permitida de la clave). Los otros modelos no se probaron. Se dejó glm-5.2 como selección inicial.
- Configurar consulta `/models`. El estado “IA verificada” solo se muestra después de recibir texto de una inferencia; la configuración por sí sola no lo afirma.
- La consulta permite adjuntar un fragmento de código. El modelo solo recibe el contenido pegado por el usuario y la conversación enviada; no tiene acceso automático al IDE o al repositorio.
- El resumen de Bitbucket/SonarQube está desactivado inicialmente. Al marcar la opción se envían conteos de registros cargados, hasta diez títulos/identificadores de PR y métricas del proyecto y rama consultados. Se omiten tokens y direcciones de servidores internos de ese resumen.
- Los resultados de IA son sugerencias: el sistema solicita distinguir evidencia, hipótesis, métricas de rama y resultados de PR. El prompt no sustituye una auditoría de seguridad.
- Errores de clave, modelo, cuota, tiempo o respuesta vacía se muestran sin mensajes de demostración como respaldo. La conversación se puede limpiar y se borra al desconectar.
- Proxy local `/huawei-maas-api/**` en shell y microfrontend hacia `https://api-ap-southeast-1.modelarts-maas.com/openai/v1`. Reiniciar ambos servidores Angular para activarlo. Para producción hace falta publicar una ruta equivalente o disponer de CORS permitido.

Huawei también ofrece plataformas para construir agentes, pero el endpoint proporcionado corresponde a inferencia MaaS. Esta integración utiliza un perfil de asistente definido en la aplicación, no afirma activar un agente preconfigurado de Huawei.
## Revisión de pull requests en el asistente

En Asistente IA se puede seleccionar un PR abierto del usuario del token, buscar por ID, título o repositorio y pulsar Cargar cambios. La lista conserva la paginación de Bitbucket.

Se consultan desde el repositorio destino del PR:

- `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}`: datos y referencias actuales.
- `.../{id}/changes`: archivos agregados, modificados, eliminados, movidos o copiados, recorriendo las páginas disponibles.
- `.../{id}/commits`: commits del PR, ordenados por fecha de commit más reciente; se muestran autor, identificador, mensaje y fecha UTC.
- `.../{id}/diff?contextLines=3&withComments=false`: líneas añadidas, eliminadas y contexto, sin comentarios de revisión.

Se vuelve a consultar el PR después de cargar. Si cambian la versión o los commits de origen/destino durante la consulta, se descartan los datos y se solicita recargar. El diff representa el PR completo frente a su destino; no únicamente el último commit. Cambiar la selección elimina la revisión anterior y desmarca la opción de compartirla.

La carga no llama a Huawei. La opción Compartir cambios del PR seleccionado debe marcarse antes de enviar una consulta de IA. Se comparte una instantánea identificada con PR, proyecto, repositorio y hashes, hasta 100 archivos, 50 commits y 20 000 caracteres de diff. Los recortes del servidor y del contexto enviado se indican expresamente. La vista previa local limita el diff a 60 000 caracteres y muestra si fue recortado. Un archivo binario o sin contenido textual no se presenta como código revisado.

El asistente recibe el diff solo al seleccionar la opción; no obtiene el repositorio completo ni ejecuta cambios. Los turnos anteriores que ya compartieron un PR siguen formando parte de la conversación hasta iniciar Nueva conversación o desconectar Huawei. Desconectar Bitbucket elimina la revisión local; no elimina mensajes previamente enviados en una conversación de Huawei.