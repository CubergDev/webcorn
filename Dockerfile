FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /build

COPY src/Main.java ./src/Main.java
RUN javac -d classes src/Main.java

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

ENV PORT=8080

COPY --from=build /build/classes ./classes
COPY . .

EXPOSE 8080


CMD ["java", "-cp", "classes", "Main"]
