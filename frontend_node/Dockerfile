FROM nginx:latest

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy your app to nginx html directory
COPY . /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]