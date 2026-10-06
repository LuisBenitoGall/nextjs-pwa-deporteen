## ADDED Requirements

### Requirement: Selector de archivos ya existentes en la vista en vivo
La vista en vivo del partido MUST ofrecer un único control para adjuntar fotos y vídeos que ya están en el dispositivo. El control MUST admitir varios archivos en un mismo gesto y MUST NOT abrir la cámara. El control MUST usar el estilo de Foto, Vídeo y Galería (borde, icono y texto corto), no el de Guardar.

#### Scenario: Usuario con almacenamiento local o Drive, fuera de iOS
- **WHEN** el usuario está en la vista en vivo, su opción de almacenamiento configurada es local o Drive, y el dispositivo no es iOS
- **THEN** la barra inferior muestra el selector de archivos existentes en el puesto que ocupaba Editar, y Editar está en la cabecera, a la derecha de «Partidos de la competición», con el mismo verde de ese enlace

#### Scenario: Varios archivos de foto y de vídeo
- **WHEN** el usuario activa el selector
- **THEN** puede elegir a la vez varias imágenes y varios vídeos, sin forzar la cámara

#### Scenario: Opción de almacenamiento R2
- **WHEN** la opción de almacenamiento configurada es R2
- **THEN** el selector de archivos existentes no se muestra

#### Scenario: Dispositivo iOS
- **WHEN** el dispositivo es iOS
- **THEN** el selector de archivos existentes no se muestra, aunque la opción de almacenamiento sea local o Drive

#### Scenario: El selector no está disponible
- **WHEN** el selector de archivos existentes no se muestra
- **THEN** la barra inferior no reserva una celda vacía y las cinco acciones restantes (pantalla activa, Foto, Vídeo, Galería y Guardar) ocupan el ancho a partes iguales

---

### Requirement: Destino del lote antes de guardar
Después de elegir los archivos, y antes de guardarlos, el usuario MUST elegir el destino de ese lote: local o Drive. La aplicación MUST NOT ofrecer R2 como destino de este flujo.

#### Scenario: Pregunta de destino
- **WHEN** el usuario ha seleccionado al menos un archivo existente
- **THEN** la aplicación pregunta si ese lote se guarda en local o en Drive, y no ofrece R2

#### Scenario: Cancelar el destino
- **WHEN** el usuario cierra la pregunta de destino sin elegir
- **THEN** no se crea ninguna fila de medio para ese lote

---

### Requirement: Guardar el lote en local copiando el archivo
El destino local MUST copiar cada archivo al almacenamiento de la app y registrar el medio del partido, de modo que la galería pueda mostrarlo y reproducirlo como el resto de medios locales. Guardar solo el nombre del archivo MUST NOT ser la forma de ver el medio. Este flujo MUST NOT aplicar los límites de cuota ni de duración del almacenamiento remoto facturable.

#### Scenario: Copia local visible en la galería
- **WHEN** el usuario elige destino local para un lote de imágenes o vídeos
- **THEN** cada archivo se copia al almacenamiento local de la app, se crea su fila de medio del partido, y la galería del partido lo muestra o lo reproduce con el mismo criterio que un medio local capturado en el partido

#### Scenario: Otro dispositivo
- **WHEN** el medio se guardó solo en local y el usuario abre la galería en otro dispositivo
- **THEN** ese medio se comporta como el resto de medios locales que no están en la nube

---

### Requirement: Guardar el lote en Drive como una captura nueva
El destino Drive MUST subir cada archivo con el mismo proceso que una foto o un vídeo tomados en el partido cuando el destino es Drive. El archivo MUST NOT enviarse a R2. Si un archivo del lote falla, el sistema MUST reutilizar el tratamiento archivo a archivo de la captura vigente, descrito en los escenarios de este requisito, y MUST NOT aplicar una política de lote distinta.

#### Scenario: Subida a Drive y reproducción
- **WHEN** el usuario elige destino Drive para un lote de imágenes o vídeos
- **THEN** cada archivo se sube a Drive por el proceso ya usado para una captura nueva y la galería del partido lo muestra o lo reproduce como cualquier otro medio de Drive de ese partido

#### Scenario: Drive no disponible
- **WHEN** el usuario elige destino Drive y la subida responde que Drive no está disponible (no configurado, servicio no disponible o reconexión necesaria)
- **THEN** ese archivo se guarda en local con el mismo tratamiento que la captura del partido, no se envía a R2, se muestra el aviso de reconexión ya existente cuando la captura lo muestra, y el sistema sigue con el siguiente archivo del lote

#### Scenario: Otro fallo de Drive
- **WHEN** la subida a Drive de un archivo del lote falla por un error distinto de Drive no disponible
- **THEN** el sistema muestra el error como en la captura del partido, no procesa los archivos siguientes del lote y conserva los archivos del lote que ya se habían guardado

## MODIFIED Requirements

### Requirement: RF-5: Gestión de Multimedia
El usuario puede agregar fotos y vídeos a un partido. El alta admite la cámara y, cuando el requisito de selector de archivos existentes aplica, archivos que ya están en el dispositivo. La galería sigue siendo solo la interfaz de visualización.

Criterios que este cambio no retira:
- El acceso a `/matches/[id]/gallery` requiere ser dueño del partido.
- Se pueden subir imágenes y vídeos.
- El almacenamiento local (IndexedDB) es el camino por defecto de un medio local.
- La galería muestra miniaturas, vista previa y permite eliminar el medio.
- Los metadatos incluyen tipo, tamaño y fecha de captura.
- La subida opcional a almacenamiento en la nube, cuando el proveedor efectivo no es el de este selector, sigue la tubería ya vigente. Este change no la redefine.

#### Scenario: La galería no distingue el origen en la reproducción
- **WHEN** un medio del partido proviene del selector de archivos existentes y ya está guardado en local o en Drive
- **THEN** la galería lo muestra o lo reproduce igual que un medio del mismo almacenamiento capturado con la cámara

#### Scenario: La cámara no cambia
- **WHEN** el usuario pulsa Foto o Vídeo en la barra de la vista en vivo
- **THEN** se abre la cámara trasera, como hasta ahora, y ese gesto no ofrece el selector de archivos ya existentes
