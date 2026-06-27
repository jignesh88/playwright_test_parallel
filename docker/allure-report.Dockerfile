# Stage 1 — generate static Allure HTML reports from raw allure-results-* dirs.
FROM eclipse-temurin:21-jre-alpine AS builder

ARG ALLURE_VERSION=2.34.1

RUN apk add --no-cache curl tar bash \
    && curl -fsSL -o /tmp/allure.tgz \
        "https://github.com/allure-framework/allure2/releases/download/${ALLURE_VERSION}/allure-${ALLURE_VERSION}.tgz" \
    && mkdir -p /opt \
    && tar -xzf /tmp/allure.tgz -C /opt \
    && ln -s "/opt/allure-${ALLURE_VERSION}/bin/allure" /usr/local/bin/allure \
    && rm /tmp/allure.tgz

WORKDIR /work

# The pipeline (or npm script) stages each suite's allure-results into a
# subdirectory under docker/staging/, e.g. docker/staging/{app,bdd,external}.
# Missing suites simply contribute no subdir and are skipped.
COPY docker/staging/ /results/

COPY docker/generate-reports.sh /usr/local/bin/generate-reports.sh
RUN chmod +x /usr/local/bin/generate-reports.sh \
    && /usr/local/bin/generate-reports.sh /results /report

# Stage 2 — serve the generated reports via nginx.
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/landing.html /usr/share/nginx/html/index.html
COPY --from=builder /report /usr/share/nginx/html/reports

EXPOSE 80
