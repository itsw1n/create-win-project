FROM {{MAVEN_IMAGE}}
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["mvn", "spring-boot:run"]
