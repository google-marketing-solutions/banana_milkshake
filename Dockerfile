#  Copyright 2026 Google LLC
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#        https://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

# Stage 1: Build the frontend, and install server dependencies
FROM node:22 AS builder

WORKDIR /app

# Copy all files from the current directory
COPY . ./
RUN echo "API_KEY=PLACEHOLDER" > ./.env
RUN echo "GEMINI_API_KEY=PLACEHOLDER" >> ./.env

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install dependencies and build the frontend
WORKDIR /app
RUN mkdir dist
RUN bash -c 'if [ -f package.json ]; then npm install && npm run build; fi'


# Stage 2: Build the final server image
FROM node:22

WORKDIR /app

#Copy server files
COPY --from=builder /app/server .
# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
