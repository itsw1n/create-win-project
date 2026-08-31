FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["./mvnw", "spring-boot:run"]
