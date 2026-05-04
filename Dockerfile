FROM nginx:alpine
RUN sed -i 's/listen       80;/listen       10000;/g' /etc/nginx/conf.d/default.conf

# ESTA ES LA LÍNEA NUEVA: Copia tu index.html a la carpeta de Nginx
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]
