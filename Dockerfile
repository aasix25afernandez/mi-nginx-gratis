FROM nginx:alpine
RUN sed -i 's/listen       80;/listen       10000;/g' /etc/nginx/conf.d/default.conf
EXPOSE 10000
CMD ["nginx", "-g", "daemon off;"]
