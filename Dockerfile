FROM obento-monitor-base:latest

WORKDIR /app

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3630
EXPOSE 3630

CMD ["npm", "run", "start"]
