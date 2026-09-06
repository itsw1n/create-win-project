FROM {{MAVEN_IMAGE}} AS builder
WORKDIR /app
COPY . .
RUN mvn --batch-mode package -DskipTests

FROM {{JAVA_IMAGE}} AS production
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=builder /app/target/*.jar app.jar
RUN chown app:app app.jar
USER app
EXPOSE 8080
CMD ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
