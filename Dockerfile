FROM python:3.13-alpine AS build
COPY . /src
WORKDIR /src
RUN pip install mkdocs-material && mkdocs build

FROM nginx:alpine
COPY --from=build /src/site /usr/share/nginx/html
