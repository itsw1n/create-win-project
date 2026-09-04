FROM {{MAVEN_IMAGE}} AS builder
WORKDIR /app
COPY . .
RUN mvn --batch-mode package -DskipTests

FROM {{JAVA_IMAGE}} AS production
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
