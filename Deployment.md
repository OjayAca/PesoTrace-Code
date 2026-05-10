• Proposed Plan                                                                                        
                                                                                                       
                                                                                                       
  # Deploy PesoTrace to Vercel + Railway                                                               
                                                                                                       
  ## Summary                                                                                           
                                                                                                       
  Deploy the repo as two services:                                                                     
                                                                                                       
  - Vercel hosts client/ as a Vite static React app.                                                   
  - Railway hosts server/ as the Express API plus a Railway MySQL database.                            
  - Production env vars connect both sides: Vercel gets VITE_API_URL; Railway gets CLIENT_ORIGIN,      
    APP_BASE_URL, MySQL credentials, JWT secret, and Resend email config.                              
                                                                                                       
  ## Key Steps                                                                                         
                                                                                                       
  ### 1. Prepare GitHub                                                                                
                                                                                                       
  - Commit and push the current repo, including the pagination changes.                                
  - Do not commit server/.env; use dashboard environment variables only.                               
                                                                                                       
  ### 2. Railway Backend + MySQL                                                                       
                                                                                                       
  - In Railway, create a new project from the GitHub repo.                                             
  - Add a MySQL service.                                                                               
  - Add an API service from the same repo with:                                                        
      - Root directory: server                                                                         
      - Start command: npm start                                                                       
      - Build command: leave auto/default                                                              
  - Add API variables:                                                                                 
                                                                                                       
    NODE_ENV=production                                                                                
    MYSQL_STORE=true                                                                                   
    MYSQL_HOST=${{ MySQL.MYSQLHOST }}                                                                  
    MYSQL_PORT=${{ MySQL.MYSQLPORT }}                                                                  
    MYSQL_USER=${{ MySQL.MYSQLUSER }}                                                                  
    MYSQL_PASSWORD=${{ MySQL.MYSQLPASSWORD }}                                                          
    MYSQL_DATABASE=pesotrace                                                                           
    JWT_SECRET=<random 32+ character secret>                                                           
    EMAIL_PROVIDER=resend                                                                              
    EMAIL_FROM=PesoTrace <no-reply@your-domain.com>                                                    
    RESEND_API_KEY=<your-resend-api-key>                                                               
    BCRYPT_ROUNDS=12                                                                                   
    CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app                                                 
    APP_BASE_URL=https://<your-vercel-app>.vercel.app                                                  
                                                                                                       
  - Do not manually set PORT; Railway provides it.                                                     
  - Run server/sql/schema.sql against the Railway MySQL database before real use. Because the schema   
    creates/uses pesotrace, keep MYSQL_DATABASE=pesotrace.                                             
                                                                                                       
  ### 3. Vercel Frontend                                                                               

  - In Vercel, import the same GitHub repo as a new project.                                           
  - Configure:                                                                                         
      - Root directory: client                                                                         
      - Framework preset: Vite                                                                         
      - Build command: npm run build                                                                   
      - Output directory: dist                                                                         
  - Add Vercel environment variable:                                                                   
                                                                                                       
    VITE_API_URL=https://<your-railway-api-domain>/api                                                 
                                                                                                       
  - Deploy production.                                                                                 
  - After the final Vercel URL is known, update Railway:                                               
                                                                                                       
    CLIENT_ORIGIN=https://<your-final-vercel-domain>                                                   
    APP_BASE_URL=https://<your-final-vercel-domain>                                                    
    Then redeploy the Railway API.                                                                     
                                                                                                       
  ## Test Plan                                                                                         
                                                                                                       
  - Check API health:                                                                                  
                                                                                                       
    curl https://<your-railway-api-domain>/api/health                                                  
    Expected: { "status": "ok" }                                                                       

  - Open the Vercel app and verify:                                                                    
      - Register works.                                                                                
    origin, including https:// and no trailing slash.

  ## Assumptions

  - Deployment workflow: GitHub dashboard deploys.
  - Database: Railway MySQL.
  - Email: Resend, using the existing server integration.
  - Preview deployments are not required. If Vercel preview URLs need API access, add them comma-      
    separated to CLIENT_ORIGIN.
  - References used: Vercel Vite/env docs, Vercel monorepo docs, Railway MySQL docs, Railway
    variables docs, Railway start command docs.