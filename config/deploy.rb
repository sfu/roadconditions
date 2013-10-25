set :stages,        %w(production_all production_1 production_2 staging)
set :default_stage, "staging"
require "capistrano/ext/multistage"

def current_git_branch
  branch = `git symbolic-ref HEAD 2> /dev/null`.strip.gsub(/^refs\/heads\//, '')
  puts "Deploying branch #{branch}"
  branch
end

set :application,   "roadconditions"
set :repository,    "git@github.com:sfu/roadconditions.git"
set :scm,           :git
set :branch,        "master"
set :user,          "nodeuser"
set :deploy_to,     "/var/nodeapps/roadconditions"
set :use_sudo,      false
set :node_env,      "production"
default_run_options[:pty] = true
ssh_options[:paranoid] = false
ssh_options[:keys] = [File.join(ENV["HOME"], ".ssh", "id_rsa")]
set :ssh_options, {:forward_agent => true}

if (ENV.has_key?('gateway') && ENV['gateway'].downcase == "true")
  gateway_user =  ENV['gateway_user'] || ENV['USER']
  set :gateway, "#{gateway_user}@welcome.its.sfu.ca"
end


# this tells capistrano what to do when you deploy
namespace :deploy do

  desc <<-DESC
  A macro-task that updates the code and fixes the symlink.
  DESC
  task :default do
    transaction do
      update_code
      node.npminstall
      roadconditions.copy_config
      symlink
    end
  end

    task :update_code, :except => { :no_release => true } do
        on_rollback { run "rm -rf #{release_path}; true" }
        strategy.deploy!
    end

    task :restart do
        run "nohup /sbin/service roadconditions restart"
    end

end

namespace :node do

    desc "Create node_modules symlink"
    task :node_modules_symlink do
        run "cd #{latest_release} && ln -s #{shared_path}/node_modules node_modules"
    end

    desc "Install node modules with npm"
    task :npminstall do
        run "cd #{latest_release} && npm install"
    end

end

namespace :roadconditions do

  desc "Copy environment-speficic config file"
  task :copy_config do
    run "cp #{shared_path}/config/#{config_file} #{latest_release}/config"
  end

end

after(:deploy, "deploy:restart")
after "deploy:restart", "deploy:cleanup"
