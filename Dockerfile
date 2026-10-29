FROM python:3.12-slim
WORKDIR /app
COPY server.py app.html index.html result.html styles.css ui.js config.js ./
COPY logo.jpg ./
RUN mkdir -p /app/data && chown -R 10001:10001 /app
USER 10001:10001
ENV HOST=0.0.0.0 PORT=8000 DATABASE_PATH=/app/data/results.sqlite3 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=3)"
CMD ["python", "server.py"]
