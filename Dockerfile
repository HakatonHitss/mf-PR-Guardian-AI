# Stage 1: Build
FROM 172.19.90.65:6000/eag/nodejs:20-debian-1 AS builder

# Es normal usar root en el builder stage si el entorno lo requiere
USER root

ARG ENV=production
ENV ENV=$ENV
ARG BUILD_VERSION=latest

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc /root/

# Bypass de proxy para Nexus interno
ENV no_proxy=172.19.90.65,localhost,127.0.0.1
ENV NO_PROXY=172.19.90.65,localhost,127.0.0.1

# Install dependencies
RUN npm install --no-audit

# Copy source
COPY . .

# Build
RUN echo "Building for environment: $ENV"
RUN npm run build
RUN echo "Build complete. Listing output:"
RUN ls -la dist/
    
# Stage 2: Serve
FROM 172.19.90.65:6000/ubi9/nginx-120

USER root

# Copy nginx configs
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/nginx.template /etc/nginx/templates/default.conf.template

# Copy build output
COPY --from=builder /app/dist/mf-PR-Guardian-AI/browser/ /usr/share/nginx/html
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh

# ---------------------------------------------------------
# AJUSTES DE PERMISOS PARA OPENSHIFT (Soporte Arbitrary UID)
# ---------------------------------------------------------
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    # Cambiamos el grupo dueño a 0 (root) en lugar de un UID específico
    chgrp -R 0 /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d /etc/nginx/templates && \
    # Damos permisos de lectura/escritura/ejecución al grupo
    chmod -R g=u /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d /etc/nginx/templates

RUN chmod +x /docker-entrypoint.sh && \
    chgrp 0 /docker-entrypoint.sh && \
    chmod g=u /docker-entrypoint.sh

RUN echo "Files in nginx html:" && \
    ls -la /usr/share/nginx/html/

# Las imágenes UBI de Nginx por defecto usan el usuario 1001, que es seguro y compatible.
USER 1001

ARG ENV=production
ARG BUILD_VERSION=latest
LABEL environment=$ENV version=$BUILD_VERSION

# OpenShift no permite puertos < 1024. 8080 es correcto.
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]