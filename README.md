# Descripción Funcional y Técnica del Proyecto: Cookbook

Este documento proporciona un resumen funcional y técnico detallado del proyecto "Cookbook", una aplicación web serverless diseñada para la gestión pública de recetas.

## 1. Descripción Funcional

"Cookbook" es una aplicación web que sirve como un **directorio público de recetas**. Permite a cualquier usuario interactuar con una colección compartida de recetas sin necesidad de autenticación.

**Funcionalidades Principales:**

* **Visualización de Recetas:** Los usuarios pueden ver una lista de todas las recetas disponibles en la página principal. Cada receta se muestra en una tarjeta con un resumen.

* **Añadir Nuevas Recetas:** Los usuarios pueden acceder a un formulario dedicado para introducir los detalles de una nueva receta y añadirla al directorio.

* **Editar Recetas Existentes:** Los usuarios pueden seleccionar una receta de la lista o desde la página de detalle para precargar sus datos en el formulario de edición y realizar modificaciones.

* **Eliminar Recetas:** Los usuarios pueden borrar recetas del directorio directamente desde la lista o desde la página de detalle.

* **Manejo de Errores y Alertas:** La aplicación cuenta con mecanismos para manejar errores en el procesamiento de mensajes. Si un mensaje no puede ser procesado y termina en la Dead-Letter Queue (DLQ), el sistema envía **notificaciones de alerta** (por correo electrónico) a un administrador.

## 2. Descripción Técnica (Arquitectura Serverless)

La aplicación "Cookbook" está construida sobre una arquitectura **serverless y basada en eventos** en Amazon Web Services (AWS). Esto significa que no hay servidores que provisionar o gestionar, y la infraestructura escala automáticamente según la demanda.



**Componentes de AWS Utilizados:**

![Arquitectura de la solución](architecture_diagram.jpg)

* **Amazon S3 (Simple Storage Service):**

    * **Rol:** Alojamiento del frontend estático (archivos HTML, CSS, JavaScript).

    * **Detalles:** Un bucket S3 está configurado para *hosting* de sitios web estáticos, accesible públicamente. Los archivos del frontend se cargan directamente desde aquí.

    * **Seguridad:** Cifrado en reposo (SSE-S3) por defecto, durabilidad de 11 nueves. Acceso público de lectura configurado mediante políticas de bucket para el *hosting* web.

* **Amazon API Gateway:**

    * **Rol:** Punto de entrada único para todas las solicitudes HTTP/HTTPS del frontend. Actúa como una API REST que enruta las solicitudes a las funciones Lambda correspondientes.

    * **Detalles:** Define los *endpoints* (`/recetas`, `/recetas/{idReceta}`) y métodos HTTP (GET, POST, PUT, DELETE). Utiliza **Integración Proxy de Lambda** para pasar la solicitud HTTP completa a las Lambdas. Se configura **CORS** para permitir la comunicación entre el frontend y el backend.

    * **Seguridad:** HTTPS/TLS por defecto, protección DDoS básica (AWS Shield Standard). Actualmente, no tiene autenticación/autorización de usuario.

* **AWS Lambda:**

    * **Rol:** Ejecuta la lógica de negocio del backend de forma serverless.

    * **Detalles:** Todas las funciones están escritas en **Python**.

        * `submitRecipeLambda`: Maneja las solicitudes `POST` y `PUT`. Valida los datos de la receta y envía la carga útil (payload) a una cola SQS para procesamiento asíncrono.

        * `processRecipeLambda`: Activada por SQS. Procesa el mensaje de la receta, realiza las operaciones de escritura/actualización en DynamoDB. La funcionalidad de publicación de notificaciones SNS tras cada creación/actualización de receta ha sido eliminada.

        * `getRecipesLambda`: Maneja las solicitudes `GET`. Recupera una o todas las recetas de DynamoDB.

        * `deleteRecipeLambda`: Maneja las solicitudes `DELETE`. Elimina una receta de DynamoDB.

    * **Seguridad:** Entornos de ejecución aislados, parches gestionados por AWS. Los permisos se otorgan a través de **Roles de IAM**.

* **Amazon SQS (Simple Queue Service):**

    * **Rol:** Cola de mensajes para desacoplar el proceso de recepción de solicitudes del procesamiento de datos en la base de datos.

    * **Detalles:** `RecipeSubmissionQueue` es la cola principal. Los mensajes de receta se envían aquí para ser procesados por `processRecipeLambda`.

    * **Seguridad:** Cifrado en reposo (SSE-SQS) y en tránsito (HTTPS/TLS).

    * **Manejo de Errores:** Configurada con una **Dead-Letter Queue (DLQ)**, `RecipeSubmissionDLQ`, a la que se mueven los mensajes si `processRecipeLambda` falla repetidamente.

* **Amazon SNS (Simple Notification Service):**

    * **Rol:** Servicio de publicación/suscripción para enviar notificaciones.

    * **Detalles:** Ya no se utiliza para notificar cada creación/actualización de receta. Su uso principal ahora es como destino para las **alarmas de CloudWatch**, enviando alertas cuando hay mensajes en la DLQ.

    * **Seguridad:** Cifrado en reposo (SSE-SNS) y en tránsito (HTTPS/TLS).

* **Amazon DynamoDB:**

    * **Rol:** Base de datos NoSQL de alto rendimiento para almacenar los datos de las recetas.

    * **Detalles:** Se utiliza una tabla `Recetas` con `idReceta` como clave primaria.

    * **Seguridad:** Cifrado en reposo (Always-On con AWS KMS) y en tránsito (HTTPS/TLS).

* **Amazon CloudWatch:**

    * **Rol:** Servicio de monitoreo y observabilidad.

    * **Detalles:** Recopila logs de todas las funciones Lambda. Se configura una **alarma** para la `RecipeSubmissionDLQ` que notifica (vía SNS) si hay mensajes fallidos en la cola de mensajes muertos, alertando sobre problemas en el procesamiento.

* **AWS IAM (Identity and Access Management):**

    * **Rol:** Gestiona de forma segura el acceso a los recursos de AWS.

    * **Detalles:** Se utilizan **roles de IAM** para definir los permisos de ejecución de las funciones Lambda, permitiéndoles interactuar con SQS, SNS y DynamoDB.

## 3. Conceptos y Patrones Arquitectónicos Clave

* **Serverless:** Elimina la gestión de servidores, escalando automáticamente y pagando solo por el uso.

* **Arquitectura Basada en Eventos:** Los componentes se comunican a través de eventos (invocaciones de Lambda, mensajes SQS/SNS), lo que promueve el desacoplamiento.

* **Procesamiento Asíncrono:** El uso de SQS permite que la API responda rápidamente al usuario mientras el procesamiento de la receta ocurre en segundo plano, mejorando la experiencia del usuario y la resiliencia.

* **Patrón Publicación/Suscripción:** SNS permite que múltiples suscriptores reciban notificaciones de eventos sin que el publicador necesite conocerlos directamente.

* **Manejo Robusto de Errores:** La DLQ y las alarmas de CloudWatch proporcionan un mecanismo para capturar, inspeccionar y ser alertado sobre mensajes que no pueden ser procesados.

* **Infraestructura como Código (IaC - Potencial):** Aunque no se implementó explícitamente en los pasos, esta arquitectura es ideal para ser definida y desplegada usando herramientas IaC como AWS SAM o Serverless Framework.

## 4. Alta Disponibilidad (HA)

La arquitectura serverless proporciona una alta disponibilidad inherente a nivel de Zona de Disponibilidad (AZ):

* **Multi-AZ por Defecto:** Servicios como S3, API Gateway, Lambda, SQS, SNS y DynamoDB son inherentemente Multi-AZ. AWS gestiona automáticamente la replicación y el *failover* dentro de una región, asegurando que si una AZ falla, la aplicación sigue operativa.


Este proyecto sirve como una base sólida para entender y construir aplicaciones serverless en AWS, demostrando patrones y servicios fundamentales para el desarrollo moderno en la nube. Se incluye el archivo template.yaml con la plantilla de CloudFormation que sería necesaria para desplegar el proyecto de 0, aunque no se ha podido probar porque incluye la creación de roles, a lo cual no tenemos permisos.