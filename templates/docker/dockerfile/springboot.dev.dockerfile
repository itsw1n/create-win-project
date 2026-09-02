FROM maven:3.9-eclipse-temurin-21-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["mvn", "spring-boot:run"]
