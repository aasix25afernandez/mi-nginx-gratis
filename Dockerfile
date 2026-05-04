FROM nginx:alpine

# 1. Cambiamos el puerto al 10000 (obligatorio para Render)
RUN sed -i 's/listen       80;/listen       10000;/g' /etc/nginx/conf.d/default.conf

# 2. COPIAMOS TODO: Esta línea toma todos tus archivos de GitHub 
# y los mete en la carpeta donde Nginx sirve la web.
COPY . /usr/share/nginx/html/

# 3. Exponemos el puerto y lanzamos Nginx
EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]
